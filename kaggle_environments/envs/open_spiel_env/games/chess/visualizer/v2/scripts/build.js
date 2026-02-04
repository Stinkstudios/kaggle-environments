import fs from 'fs'

if (!process.env.VITE_REPLAY_FILE) process.exit();

console.log("Copy replay", process.env.VITE_REPLAY_FILE)

fs.cp(
  process.env.VITE_REPLAY_FILE, 
  'dist/' + process.env.VITE_REPLAY_FILE, 
  {recursive: true}, 
  (err) => {
    if (err) console.log(err)
    process.exit();
  }
)
