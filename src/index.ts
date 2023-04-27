import ping from 'ping'
import { GetPing, Prisma, PrismaClient } from '@prisma/client'
import axios from 'axios'
import PQueue from 'p-queue'

const locations = new PQueue({ concurrency: 1 })

interface locationdata {
  ip: string
  network: string
  version: string
  city: string
  region: string
  region_code: string
  country: string
  country_name: string
  country_code: string
  country_code_iso3: string
  country_capital: string
  country_tld: string
  continent_code: string
  in_eu: boolean
  postal: string
  latitude: number
  longitude: number
  timezone: string
  utc_offset: string
  country_calling_code: string
  currency: string
  currency_name: string
  languages: string
  country_area: number
  country_population: number
  asn: string
  org: string
}

const prisma = new PrismaClient({
    log: [
        { level: 'error', emit: 'event' }
    ]
})

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await new Promise((resolve) => setTimeout(resolve, 60000))
    process.exit(1)
})

function gethosts(){
    let hostss = ''
    if(process.env.Hostss1 !== undefined){
        hostss += process.env.Hostss1
    }
    if(process.env.Hostss2 !== undefined){
        hostss += process.env.Hostss2
    }
    if(process.env.Hostss3 !== undefined){
        hostss += process.env.Hostss3
    }
    if(process.env.Hostss4 !== undefined){
        hostss += process.env.Hostss4
    }
    if(process.env.Hostss5 !== undefined){
        hostss += process.env.Hostss5
    }
    if(process.env.Hostss6 !== undefined){
        hostss += process.env.Hostss6
    }
    return hostss
}

async function main (): Promise<void> {
    await prisma.$connect()
    prisma.$on('error', (e: Prisma.LogEvent) => {
        console.log('Error: ')
        console.log(e)
    })
    await prisma.getPing.updateMany({
        where: {
            active: true
        },
        data: {
            active: false
        }
    })
    await overlist(gethosts().split(',') ?? [])
    await getlocations()
    await new Promise<void>((resolve) => {
        locations.on('empty', () => { resolve() })
    })
    await prisma.getPing.deleteMany({
        where: { active: false }
    })
    const data = await prisma.getPing.findMany({
        select: { name: true },
        where: { active: true }
    })
    setInterval(() => { void overlist(data.map((value: { name: string }): string => value.name)) }, 60000)
}

async function getlocations (): Promise<void> {
    const all = await prisma.getPing.findMany({
        where: {
            OR: [
                { longitude: null },
                { latitude: null },
                { country: null }
            ]
        }
    })
    all.map(async (value: GetPing) => {
        await locations.add(async () => {
            const { data } = await axios.get<locationdata>(`https://ipapi.co/${value.ip}/json`)
            if (data.longitude === null || data.latitude === null || data.country_name === null) {
                await prisma.getPing.update({
                    where: { name: value.name },
                    data: {
                        active: false
                    }
                })
            } else {
                await prisma.getPing.update({
                    where: { name: value.name },
                    data: {
                        longitude: data.longitude,
                        latitude: data.latitude,
                        country: data.country_name
                    }
                })
            }
            await new Promise((resolve) => setTimeout(resolve, 2000))
        })
    })
}

async function overlist (data: string[]): Promise<void> {
    await new Promise<void>((resolve) => {
        data.map(async (value, index, array) => {
            await doPinging(value)
            if (index === array.length - 1) { resolve() }
        })
    })
}

async function doPinging (value: string): Promise<void> {
    const pingg = await ping.promise.probe(value)
    const matc = pingg.output.match(/((?:(?:25[0-5]|(?:2[0-4]|1\d|[1-9]|)\d)\.?\b){4})/)
    const address = matc !== null ? matc[0] : undefined
    const time = pingg.time === 'unknown' ? undefined : pingg.time
    if (address !== undefined) {
        await prisma.getPing.upsert({
            where: { name: value },
            update: {
                lastPing: time === undefined ? null : time,
                active: true
            },
            create: {
                ip: address,
                lastPing: time,
                name: value,
                active: true
            }
        })
    }
}
