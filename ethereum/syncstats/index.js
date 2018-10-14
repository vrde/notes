const Web3 = require("web3")
const express = require('express')
const app = express()
const port = 8000

const web3Local = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
const web3Main = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/${process.env.INFURA_API_KEY}:8545`))

app.get('/', async (req, res, next) => {
        const localHeight = await web3Local.eth.getBlockNumber()
        const mainHeight = await web3Main.eth.getBlockNumber()
        const percentage = (100*localHeight/mainHeight).toFixed(2) + "%"
        res.setHeader('Content-Type', 'text/plain')
        res.end(`local height: ${localHeight}, main net height: ${mainHeight}, percentage: ${percentage}`)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
