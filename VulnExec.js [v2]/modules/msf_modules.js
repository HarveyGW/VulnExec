const { spawn, exec } = require('child_process')
const {chunksToLinesAsync, chomp} = require('@rauschma/stringio');
var all_vuln = []

// Import modules


const util = require('./spinnier')
const log = require('./log')


async function echoReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) { // (C)
        console.log(chomp(line));
    }
}

search_vuln = async (vuln) => {
    util.spinner.add('msf', {text: `Searching Metasploit for ${vuln}`, spinnerColor: 'redBright'})
    const msf = spawn('msfconsole', ['-q', '-x', `search ${vuln}`])
    
    log.info(msf.stdout)

    msf.stdout.on('data', (data) => {
        data = data.toString()

        if (data.includes('No results from search')) {
            return false
        } else if (data.includes(' 1 ')) {
            return true
        }
    })
    msf.on('close', (code) => {
        util.spinner.succeed('msf', {text: `Search Complete`, succeedColor: 'greenBright'})
    })
    msf.stderr.on('data', (data) => {
        data = data.toString()
        if (data.includes('stty')) {
            
        } else {
            log.info(data)
        }
    })
}

module.exports = { search_vuln }