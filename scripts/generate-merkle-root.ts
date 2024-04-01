import { program } from 'commander'
import fs from 'fs'
import { parseBalanceMap } from '../src/parse-balance-map'
import { isAddress, parseEther } from 'ethers/lib/utils'

program
    .version('0.0.0')
    .requiredOption(
        '-i, --input <path>',
        'input JSON file location containing a map of account addresses to string balances'
    )
    .option(
        '-a, --amount <amount>',
        'default amount to use for each account',
        '0.1'
    )

program.parse(process.argv)

let obj;

if (program.input.endsWith('.json')) {
    obj = JSON.parse(fs.readFileSync(program.input, { encoding: 'utf8' }))
} else if (program.input.endsWith('.csv')) {
    obj = fs.readFileSync(program.input, { encoding: 'utf8' })
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2)
        .map(line => {
            const [address, earnings] = line.split(',')
            return {
              address, earnings: parseEther(earnings || program.amount).toHexString(), reasons: '',
            }
        }).filter(({ address }) => isAddress(address))
} else {
    throw new Error('Invalid input file format')
}

if (typeof obj !== 'object') throw new Error('Invalid JSON')

const balanceMap = parseBalanceMap(obj);
console.log(`Merkle root: ${balanceMap.merkleRoot}`)
console.log(`Total amount: ${balanceMap.tokenTotal}`)
console.log('Claims:')
console.log('index,address,amount,proof')
for (const [address, { index, amount, proof }] of Object.entries(balanceMap.claims)) {
    console.log(`${index},${address},${amount},${proof.join(' ')}`)
}
