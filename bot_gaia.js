import config from "./config.json" with {type: "json"};
import axios from "axios";
import _ from "lodash";
import fs from "fs";
import {performance} from "perf_hooks";


const CHUNK_SIZE = 5;

const proceedString = async (string) => {

  const resultString = `${string[0]}${string[1]}${string[2]}`;
  const charsCount = [1, 3];

  const deepProceedString = (chars) => {
    return string
        .substring(chars, string.length - 1)
        .replace(/\\n/g, ' ')
        .replace(/\\n\\n/g, ' ')
        .replace(/\\"/g, '"')
        .replace(/ {2,}/g, " ");
  }

  return deepProceedString((resultString === '": ') ? charsCount[1] : charsCount[0]);
}

async function postToNode(phrase) {
  return new Promise((nodeTaskCompleted, reject) => {
    return axios.post(config.url, {
      messages: [
        {role: "system", content: "You are a helpful assistant."},
        {role: "user", content: phrase}
      ]
    })
        .then(async (response) => {
          try {
            const string = JSON.stringify(response.data["choices"][0].message.content);
            const result = await proceedString(string);
            nodeTaskCompleted(result);
          } catch (error) {
            reject(`${error.message}`);
          }
        })
        .catch(error => {
          reject(`${error.message}`);
        });
  })
}

(async () => {
  const phrasesArray = fs.readFileSync(config.pathToFile).toString().split('\n').filter(line => line.trim() !== '');
  let roundCounter = 0;

  while (true) {
    let chunks = _.chunk(_.shuffle(phrasesArray), CHUNK_SIZE);
    for (const chunk of chunks) {
      let chunkStarted = performance.now();
      let promises = [];
      roundCounter++;

      for (const phrase of chunk) {
        promises.push(
            postToNode(phrase)
        )
      }

      console.info(`>> Round: ${roundCounter} | Requests sent: ${chunk.length}.`);
      let results = await Promise.all(promises).catch((err) => {
        console.error(`<< Round: ${roundCounter} |`, err);
      });

      let chunkFinished = performance.now();
      let elapsed_time = chunkFinished - chunkStarted;
      console.info(`<< Round: ${roundCounter} | Responses received::  ${chunk.length}. Execution time: ${elapsed_time / 1000} seconds`);

      console.log('_____________________________________________________\n');

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
})();