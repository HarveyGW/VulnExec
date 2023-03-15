const chalk = require('chalk');

vuln = (text) => {
    console.log(chalk.redBright('[ VULN EXEC ] ') + text);
}

info = (text) => {
    console.log(chalk.blueBright('[ INFO ] ') + text);
}

success = (text) => {
    console.log(chalk.greenBright('[ SUCCESS ] ') + text);
}

error = (text) => {
    console.log(chalk.redBright('[ ERROR ] ') + text);
}


module.exports = {
    chalk,
    vuln,
    info,
    success,
    error
}