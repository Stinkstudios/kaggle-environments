#!/bin/sh

# Download a list of all chess matches
curl 'https://www.kaggle.com/api/i/competitions.EpisodeService/ListEpisodes' \
  -H 'content-type: application/json' \
  --data-raw '{"ids":[],"benchmarkTaskVersionFilter":{"benchmarkModelVersionId":57,"benchmarkTaskVersionId":396},"successfulOnly":true}' \
  --compressed \
  --output episodes.json

# Get every match available, there are a lot of them, and many are large files
# EPISODE_LIST=$(cat episodes.json | jq '.episodes | map(.id) | join(" ")')

# Get a subset of them spread across some different LLMs
EPISODE_LIST=$(cat episodes.json | jq -r '.episodes | group_by([.agents[].submissionId] | sort) | map(.[0].id) | join(" ")')

for EPISODE_ID in $EPISODE_LIST; do

  # Download the full OpenSpiel replay file for the match
  curl 'https://www.kaggle.com/api/i/competitions.EpisodeService/GetEpisodeReplay' \
    -H 'content-type: application/json' \
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
