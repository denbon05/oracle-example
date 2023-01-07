import axios from "axios";
import BN from "bn.js";
import type Web3 from "web3";
import { Contract, EventData } from "web3-eth-contract";
import type { AbiItem } from "web3-utils";
import path from "path";
import * as common from "./utils/common";
import OracleJSON from "../oracle/build/contracts/EthPriceOracle.json";

// todo: refactor
const SLEEP_INTERVAL = Number(process.env.SLEEP_INTERVAL) || 2000;
const PRIVATE_KEY_FILE_NAME =
  process.env.PRIVATE_KEY_FILE ||
  path.join(__dirname, "..", "oracle/oracle_private_key");
const CHUNK_SIZE = process.env.CHUNK_SIZE || 3;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 5;

const pendingRequests: { callerAddress: string; id: number }[] = [];

const getOracleContract = async (web3js: Web3) => {
  const networkId = await web3js.eth.net.getId();
  return new web3js.eth.Contract(
    OracleJSON.abi as AbiItem[],
    OracleJSON.networks[networkId].address
  );
};

async function retrieveLatestEthPrice() {
  const {
    data: { price },
  } = await axios({
    url: "https://api.binance.com/api/v3/ticker/price",
    params: {
      symbol: "ETHUSDT",
    },
    method: "get",
  });

  return price;
}

async function setLatestEthPrice({
  oracleContract,
  callerAddress,
  ownerAddress,
  ethPrice,
  id,
}) {
  const ethPriceDecimal = ethPrice.replace(".", "");
  const multiplier = new BN(10 ** 10, 10);
  const ethPriceInt = new BN(parseInt(ethPriceDecimal), 10).mul(multiplier);
  const idInt = new BN(parseInt(id));

  try {
    await oracleContract.methods
      .setLatestEthPrice(
        ethPriceInt.toString(),
        callerAddress,
        idInt.toString()
      )
      .send({ from: ownerAddress });
  } catch (error) {
    console.log("Error encountered while calling setLatestEthPrice.");
    // Do some error handling
  }
}

const processRequest = async ({
  oracleContract,
  ownerAddress,
  id,
  callerAddress,
}) => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const ethPrice = await retrieveLatestEthPrice();
      // eslint-disable-next-line no-await-in-loop
      await setLatestEthPrice({
        oracleContract,
        callerAddress,
        ownerAddress,
        ethPrice,
        id,
      });
      return;
    } catch (error) {
      if (retries === MAX_RETRIES - 1) {
        // eslint-disable-next-line no-await-in-loop
        await setLatestEthPrice({
          oracleContract,
          callerAddress,
          ownerAddress,
          ethPrice: 0,
          id,
        });
        return;
      }

      retries += 1;
      console.log({ retries });
    }
  }
};

const processQueue = async (oracleContract: Contract, ownerAddress: string) => {
  let processedRequests = 0;

  while (pendingRequests.length && processedRequests < CHUNK_SIZE) {
    const { id, callerAddress } = pendingRequests.shift();
    // eslint-disable-next-line no-await-in-loop
    await processRequest({
      oracleContract,
      ownerAddress,
      id,
      callerAddress,
    });

    processedRequests += 1;
  }
};

const addRequestToQueue = async (event: EventData) => {
  const { callerAddress } = event.returnValues;
  const { id } = event.returnValues;

  pendingRequests.push({ callerAddress, id });
};

const filterEvents = async (oracleContract: Contract, web3js: Web3) => {
  oracleContract.events.GetLatestEthPriceEvent(async (err, event) => {
    if (err) {
      console.error("Error on event", err);
      return;
    }

    await addRequestToQueue(event);
  });

  oracleContract.events.SetLatestEthPriceEvent(async (err, event) => {
    if (err) {
      console.error("Error on event", err);
    }
    // Do something
  });
};

const init = async () => {
  const { client, ownerAddress, web3js } = common.loadAccount(
    PRIVATE_KEY_FILE_NAME
  );

  const oracleContract = await getOracleContract(web3js);
  filterEvents(oracleContract, web3js);

  return {
    oracleContract,
    ownerAddress,
    client,
  };
};

(async () => {
  const { oracleContract, ownerAddress, client } = await init();

  process.on("SIGINT", () => {
    console.log("Calling client.disconnect()");
    client.disconnect();
    process.exit();
  });

  setInterval(async () => {
    await processQueue(oracleContract, ownerAddress);
  }, SLEEP_INTERVAL);
})();
