#!/bin/sh

# Download a list of all chess matches
curl 'https://www.kaggle.com/api/i/competitions.EpisodeService/ListEpisodes' \
  -H 'accept: application/json' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'content-type: application/json' \
  -b 'ka_sessionid=cbe3169328c9ffdc5f1733933a2220be; _ga=GA1.1.493385066.1769180017; ACCEPTED_COOKIES=true; __Host-KAGGLEID=CfDJ8MObNv7beYBJjzZT7SO0JVKd6dKUbjXSuEzpFTbap0eV8i91ZrWYskfEJVcWrLw9NXPFB2w2GNqpnlMPxAlT4dYBQWBbortvDtayeXuMLMrqg9HrJfHf6xuI; CSRF-TOKEN=CfDJ8KfhQMrVil5MrZ6RWpmB4eHXx4OxqiG3Dhg4DxiUlXicg0Ox-5KJ9VzvBziiZEdyhA99vzdDE1YWt6zwI9c9m4SlsYYcm1-Ndx22nCiYPQ; ka_db=CfDJ8KfhQMrVil5MrZ6RWpmB4eFGOv08-dguNl6j3Y7xBf2RrpJFSZEfyfudecpj8-dENGVzemApqrNIxhbTF_XM4MwWwq3cfzLS-zzaRvJRrsMqqiw-BL9bkEz811w; GCLB=CMWN5eK04qutYhAD; build-hash=d214062d986cf28a2145ed7b2f1bb333b276189d; XSRF-TOKEN=CfDJ8KfhQMrVil5MrZ6RWpmB4eEKepbjfzmiRsec13I4iTxjhtJVe6JXuKuGd639R6iCm2QOauSTcqYAI-jjwb7AIadWhaCxkDs0o6e1qLmWL3PBHeJl_RA36w2V0OBWdKX9EeseKozcPcoF4uNXxTdALY8; CLIENT-TOKEN=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJrYWdnbGUiLCJhdWQiOiJjbGllbnQiLCJzdWIiOiJqaW1hdHN0aW5rIiwibmJ0IjoiMjAyNi0wMS0zMFQxMzozMjoyMS40MTQ2NDExWiIsImlhdCI6IjIwMjYtMDEtMzBUMTM6MzI6MjEuNDE0NjQxMVoiLCJqdGkiOiI3MWJjZTliYS01MDFhLTQyYjEtYTRmZi1iNWFkMDAwYjMyNTUiLCJleHAiOiIyMDI2LTAyLTI4VDEzOjMyOjIxLjQxNDY0MTFaIiwidWlkIjozMjAxOTE2NSwiZGlzcGxheU5hbWUiOiJKaW0gSHVudCIsImVtYWlsIjoiamltQHN0aW5rc3R1ZGlvcy5jb20iLCJ0aWVyIjoiY29udHJpYnV0b3IiLCJ2ZXJpZmllZCI6ZmFsc2UsInByb2ZpbGVVcmwiOiIvamltYXRzdGluayIsInRodW1ibmFpbFVybCI6Imh0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9rYWdnbGUtYXZhdGFycy90aHVtYm5haWxzLzMyMDE5MTY1LWtnLnBuZz90PTIwMjYtMDEtMjctMTctMjEtMDQiLCJmZmgiOiI1YmZmYzJlYjMyOTNhZmJlZDExZWFkNDAwMzNmYTk0MGM2OWFlNTYzY2Q3NTIwYzAxZDYwNDE3NjI5OTNiNzAzIiwicGlkIjoia2FnZ2xlLTE2MTYwNyIsInN2YyI6IndlYi1mZSIsInNkYWsiOiJBSXphU3lBNGVOcVVkUlJza0pzQ1pXVnotcUw2NTVYYTVKRU1yZUUiLCJibGQiOiJkMjE0MDYyZDk4NmNmMjhhMjE0NWVkN2IyZjFiYjMzM2IyNzYxODlkIn0.; _ga_T7QHS60L4Q=GS2.1.s1769776911$o13$g1$t1769780058$j57$l0$h0' \
  -H 'origin: https://www.kaggle.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.kaggle.com/benchmarks/kaggle/chess-text/versions/1/leaderboard' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
  -H 'x-kaggle-build-version: d214062d986cf28a2145ed7b2f1bb333b276189d' \
  -H 'x-xsrf-token: CfDJ8KfhQMrVil5MrZ6RWpmB4eEKepbjfzmiRsec13I4iTxjhtJVe6JXuKuGd639R6iCm2QOauSTcqYAI-jjwb7AIadWhaCxkDs0o6e1qLmWL3PBHeJl_RA36w2V0OBWdKX9EeseKozcPcoF4uNXxTdALY8' \
  --data-raw '{"ids":[],"benchmarkTaskVersionFilter":{"benchmarkModelVersionId":57,"benchmarkTaskVersionId":396},"successfulOnly":true}' \
  --compressed \
  --output episodes.json

# Extract all the episode id's into a simple string to loop through

# Get every match available, there are a lot of them, and many are large files
# EPISODE_LIST=$(cat episodes.json | jq '.episodes | map(.id) | join(" ")')

# Get a subset of them spread across some different LLMs
EPISODE_LIST=$(cat episodes.json | jq -r '.episodes | group_by([.agents[].submissionId] | sort) | map(.[0].id) | join(" ")')

for EPISODE_ID in $EPISODE_LIST; do

  # Download the full OpenSpiel replay file for the match
  curl 'https://www.kaggle.com/api/i/competitions.EpisodeService/GetEpisodeReplay' \
    -H 'accept: application/json' \
    -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
    -H 'content-type: application/json' \
    -b 'ka_sessionid=cbe3169328c9ffdc5f1733933a2220be; _ga=GA1.1.493385066.1769180017; ACCEPTED_COOKIES=true; __Host-KAGGLEID=CfDJ8MObNv7beYBJjzZT7SO0JVKd6dKUbjXSuEzpFTbap0eV8i91ZrWYskfEJVcWrLw9NXPFB2w2GNqpnlMPxAlT4dYBQWBbortvDtayeXuMLMrqg9HrJfHf6xuI; CSRF-TOKEN=CfDJ8KfhQMrVil5MrZ6RWpmB4eHXx4OxqiG3Dhg4DxiUlXicg0Ox-5KJ9VzvBziiZEdyhA99vzdDE1YWt6zwI9c9m4SlsYYcm1-Ndx22nCiYPQ; XSRF-TOKEN=CfDJ8KfhQMrVil5MrZ6RWpmB4eHeiouDKRsUGo-YlF-6X6f1dwzfljeMUYv40f2tBnrvzcMcnEXSr5JHayjFwGs_rh25oEb5yr4FtTfcpBEK6SGj80yXLYzWLnqASk_sT0pEHm02QMyB2dGs1xr959ydVAs; CLIENT-TOKEN=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJrYWdnbGUiLCJhdWQiOiJjbGllbnQiLCJzdWIiOiJqaW1hdHN0aW5rIiwibmJ0IjoiMjAyNi0wMS0zMFQxMjo0MTo1Mi43NDQ3ODQxWiIsImlhdCI6IjIwMjYtMDEtMzBUMTI6NDE6NTIuNzQ0Nzg0MVoiLCJqdGkiOiJlNGQyNTk4MS0wYjhiLTQwMmUtOGVmOC00YzQzODU4MmQ3ODciLCJleHAiOiIyMDI2LTAyLTI4VDEyOjQxOjUyLjc0NDc4NDFaIiwidWlkIjozMjAxOTE2NSwiZGlzcGxheU5hbWUiOiJKaW0gSHVudCIsImVtYWlsIjoiamltQHN0aW5rc3R1ZGlvcy5jb20iLCJ0aWVyIjoiY29udHJpYnV0b3IiLCJ2ZXJpZmllZCI6ZmFsc2UsInByb2ZpbGVVcmwiOiIvamltYXRzdGluayIsInRodW1ibmFpbFVybCI6Imh0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbS9rYWdnbGUtYXZhdGFycy90aHVtYm5haWxzLzMyMDE5MTY1LWtnLnBuZz90PTIwMjYtMDEtMjctMTctMjEtMDQiLCJmZmgiOiI1YmZmYzJlYjMyOTNhZmJlZDExZWFkNDAwMzNmYTk0MGM2OWFlNTYzY2Q3NTIwYzAxZDYwNDE3NjI5OTNiNzAzIiwicGlkIjoia2FnZ2xlLTE2MTYwNyIsInN2YyI6IndlYi1mZSIsInNkYWsiOiJBSXphU3lBNGVOcVVkUlJza0pzQ1pXVnotcUw2NTVYYTVKRU1yZUUiLCJibGQiOiJkMjE0MDYyZDk4NmNmMjhhMjE0NWVkN2IyZjFiYjMzM2IyNzYxODlkIn0.; ka_db=CfDJ8KfhQMrVil5MrZ6RWpmB4eFGOv08-dguNl6j3Y7xBf2RrpJFSZEfyfudecpj8-dENGVzemApqrNIxhbTF_XM4MwWwq3cfzLS-zzaRvJRrsMqqiw-BL9bkEz811w; GCLB=CMWN5eK04qutYhAD; build-hash=d214062d986cf28a2145ed7b2f1bb333b276189d; _ga_T7QHS60L4Q=GS2.1.s1769776911$o13$g1$t1769776916$j55$l0$h0' \
    -H 'origin: https://www.kaggle.com' \
    -H 'priority: u=1, i' \
    -H 'referer: https://www.kaggle.com/benchmarks/kaggle/chess-text/versions/1/leaderboard?episodeId=72903677' \
    -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
    -H 'sec-ch-ua-mobile: ?0' \
    -H 'sec-ch-ua-platform: "macOS"' \
    -H 'sec-fetch-dest: empty' \
    -H 'sec-fetch-mode: cors' \
    -H 'sec-fetch-site: same-origin' \
    -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
    -H 'x-kaggle-build-version: d214062d986cf28a2145ed7b2f1bb333b276189d' \
    -H 'x-xsrf-token: CfDJ8KfhQMrVil5MrZ6RWpmB4eHeiouDKRsUGo-YlF-6X6f1dwzfljeMUYv40f2tBnrvzcMcnEXSr5JHayjFwGs_rh25oEb5yr4FtTfcpBEK6SGj80yXLYzWLnqASk_sT0pEHm02QMyB2dGs1xr959ydVAs' \
    --data-raw "{\"episodeId\":$EPISODE_ID}" \
    --compressed \
    --output "$EPISODE_ID.json"

  # Extract the names of the LLMs and format them to use as the filename
  EPISODE_NAME=$(cat $EPISODE_ID.json | jq --raw-output '.info.TeamNames | join("-") | gsub(" "; "")')

  # Format the json to read it
  cat $EPISODE_ID.json | python -m json.tool > $EPISODE_ID-$EPISODE_NAME.json

  # Gzip the original file, how big was it to deliver to the browser?
  gzip $EPISODE_ID.json

done 
