import type { Contract } from "web3-eth-contract";
import axios from "axios";
import path from "path";
import * as common from "./utils/common";
import CallerJSON from "../caller/build/contracts/CallerContract.json";
import OracleJSON from "../oracle/build/contracts/EthPriceOracle.json";

const SLEEP_INTERVAL = Number(process.env.SLEEP_INTERVAL) || 2000;
const PRIVATE_KEY_FILE_NAME =
  process.env.PRIVATE_KEY_FILE ||
  path.join(__dirname, "..", "caller/caller_private_key");

async function getCallerContract(web3js) {
  const networkId = await web3js.eth.net.getId();
  return new web3js.eth.Contract(
    CallerJSON.abi,
    CallerJSON.networks[networkId].address
  );
}

async function retrieveLatestEthPrice() {
  const resp = await axios({
    url: "https://api.binance.com/api/v3/ticker/price",
    params: {
      symbol: "ETHUSDT",
    },
    method: "get",
  });
  return resp.data.price;
}

async function filterEvents(callerContract) {
  callerContract.events.PriceUpdatedEvent(
    { filter: {} },
    async (err, event) => {
      if (err) console.error("Error on event", err);
      console.log(
        `* New PriceUpdated event. ethPrice: ${event.returnValues.ethPrice}`
      );
    }
  );

  callerContract.events.ReceivedNewRequestIdEvent(
    { filter: {} },
    async (err, event) => {
      if (err) console.error("Error on event", err);
    }
  );
}

async function init() {
  const { ownerAddress, web3js, client } = common.loadAccount(
    PRIVATE_KEY_FILE_NAME
  );

  const callerContract: Contract = await getCallerContract(web3js);
  filterEvents(callerContract);

  return { callerContract, ownerAddress, client, web3js };
}

(async () => {
  const { callerContract, ownerAddress, client, web3js } = await init();

  process.on("SIGINT", () => {
    console.log("Calling client.disconnect()");
    client.disconnect();
    process.exit();
  });

  const networkId = await web3js.eth.net.getId();
  const oracleAddress = OracleJSON.networks[networkId].address;

  await callerContract.methods
    .setOracleInstanceAddress(oracleAddress)
    .send({ from: ownerAddress });

  setInterval(async () => {
    await callerContract.methods.updateEthPrice().send({ from: ownerAddress });
  }, SLEEP_INTERVAL);
})();
