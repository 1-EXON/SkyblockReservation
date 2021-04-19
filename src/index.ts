import path from 'path'
import fetch from 'node-fetch'
import { Client, Message, MessageEmbed, TextChannel } from 'discord.js'
import { readJSONSync } from 'fs-extra'

import Item from './classes/Item'
import Product from './classes/Product'
import removeColor from './utils/removeColor'
import getItem from './utils/getItem'
import product2embed from './utils/product2embed'

const client = new Client()
const PATH = path.resolve()
const { token, mariadb, prefix } = readJSONSync(PATH + '/settings.json')
const db = require('knex') ({
    client: 'mysql2',
    connection: {
        host     : mariadb.host,
        port     : mariadb.port,
        user     : mariadb.user,
        password : mariadb.password,
        database : mariadb.database
    }
})

const get = async (str: string) => await (await fetch(str)).json()
const getBin = (str: string) => {
    switch (str) {
        case 'bin': return 1
        case 'auction': return 2
        case 'any': return 0
        default: return 0
    }
}

client.on('ready', async () => {
    console.log('[*] Ready')

    setInterval(async () => {
        await main()
    }, 60000)
})

client.on('message', async (msg) => {
    if (msg.author.bot) return
    if (!msg.content.startsWith(prefix)) return

    let args: string[] = msg.content.split(/ +(?=[\w]+\:)/g).slice(1)

    if (args[0] === '예약') {
        const price: number = +args[2]
        const isBin: number = getBin(args[3].toLowerCase())

        await db('channels').insert({ user: msg.author.id, channel_id: msg.channel.id, item_name: args[1], item_price: price, item_bin: isBin})
    } else if (args[0] === '목록') {
        console.log('f')
        const rows = await db('channels').select('*').where('user', msg.author.id)
        let message = ''
        rows.forEach((row: { item_name: string }) => {
            message += row.item_name + '\n'
        })
        msg.channel.send(message)
    } else if (args[0] === '삭제') {
        
    }
})

async function main() {
    console.log('Loading...')
    const data = await get('https://api.hypixel.net/skyblock/auctions')
    if (!data.success) return
    let products: Product[] = new Array<Product>()
    for (let i = 0; i < data.auctions.length; i++) {
        const auctioneer = await get('https://sessionserver.mojang.com/session/minecraft/profile/' + data.auctions[i].auctioneer)
        products.push(new Product(
            data.auctions[i].uuid,
            auctioneer.name,
            data.auctions[i].profile_id,
            data.auctions[i].coop,
            data.auctions[i].start,
            data.auctions[i].end,
            data.auctions[i].item_name,
            removeColor(data.auctions[i].item_lore),
            data.auctions[i].extra,
            data.auctions[i].category,
            data.auctions[i].tier,
            data.auctions[i].starting_bid,
            data.auctions[i].item_bytes,
            data.auctions[i].claimed,
            data.auctions[i].clasimed_bidders,
            data.auctions[i].highest_bid_amount,
            data.auctions[i].bids,
            data.auctions[i].bin ? true : false
        ))
    }
    
    const item: Item = new Item('Leggings', 400000000, 0)
    console.log(item)
    const item_list: Product[] = getItem(products, item)
    console.log(item_list)
    const embeds: MessageEmbed[] = product2embed(item_list)

    // embeds.forEach(async (embed) => {
    //     console.log('Sending...')
    //     setTimeout(() => { (client?.channels?.cache?.get(channel_id) as TextChannel)?.send(embed) }, 1000)
    // })
}

client.login(token)
