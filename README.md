# oracle-example

<p>Oracle example with truffle.</p>

## Usage

```bash
make ci

make generate-keys

make deploy-all
```

<p>
  The contracts were deployed to the <a href="https://loomx.io/developers/en/testnet-plasma.html#extdev-testnet">extdev</a> test net.
</p>

<p>Run the following commands in different terminals:</p>

```bash
make start-oracle # 1th

make start-client # 2th
```

<p>
  You subscribed to ETH price updates. 
</p>

### Troubleshooting

<ul>
  <li><a href="https://github.com/juanfranblanco/vscode-solidity/issues/370#issuecomment-1373455880" target="_blank">Solidity-extension in VS Code can't resolve the imports from node_modules</a></li>
</ul>
