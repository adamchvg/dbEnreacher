require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');
const express = require('express');
const { OpenAI } = require('openai');
const {readFromSheet, writeToSheet, clearSheet, updateSheetWithUniqueData, normalizeData} = require('./google');
const {createChatCompletion, counter} = require('./openai');
const {runChat} = require('./gemini');
const {getRandomNumber, removeDuplicates, sleep, sendFinishSignal} = require('./utilities');

const google_sheet_ID = inMemoryConfig['SPREADSHEET_ID'];

async function fetchAndProcessData() {
    const normalizedData = await normalizeData();
    let results = [];
    const excludedDomains = ["yelp.com", "wikipedia.org", "yellowpages.com", "mapquest.com", 
    "whitecap.com", "dnb.com", "manta.com", "facebook.com", "news-savings.hpmhawaii.com", "chamberofcommerce.com", 
    "thebluebook.com", "redfin.com", "safer.fmcsa.dot.gov", "members.ficap.org", "handle.com", 
    "apps.sos.wv.gov", "cylex.us.com", "osha.gov", "opencorporates.com", "buzzfile.com", "mfg.com", 
    "concrete-form-companies.cmac.ws", "tpr.fmcsa.dot.gov", "phillipsmfg.com"];
  
    let row = 2; // Начинаем со строки 
    try {
        for (let [companyName, companyAddress, companyWeb, websiteByAI, aiResponse, LinkedIn, aiResponseToLinkedIn, Rank, CompanySize, LastChange] of normalizedData) {
            if (!LastChange) {
              console.log(companyName, companyAddress);
              let searchQuery = `${companyName} ${companyAddress} official website`;
              let config = {
                  method: 'post',
                  url: 'https://google.serper.dev/search',
                  headers: { 
                      'X-API-KEY': process.env.SERPER_API, 
                      'Content-Type': 'application/json'
                  },
                  data: JSON.stringify({ "q": searchQuery })
              };
              
              if (companyWeb && !excludedDomains.some(domain => companyWeb.includes(domain))) {
                  let promptToRange = `I am a steel detailer working on structural and miscellaneous steel projects.
                  
                  My ideal client is a steel FABRICATOR (not a design or engineering company), who fabricates structural or miscellaneous steel in HIS OWN plant: structural steel, platforms, towers, equipment dunnages, steel supports, new bridge steel and bridge repair steel, stairs and rails, handrails, and guardrails, ladders, gates, bollards, equipment supports.
                  
                  We don't work with steel Erectors or General Contractors unless they provide steel fabrication services similar to listed above. 
                  
                  WE DO NOT work with fabricators who fabricate only Pre-Engineered Metal Buildings, or open web joists, or custom metal products without any items listed above.
                  
                  How relevant is this company to me? Shall I get in touch with them and propose my services?
                  (Rate it from 1 to 10). Answer in only number!
                  
                  Company Website: ${companyWeb}`;
                  
                  const aiResponse = await runChat(companyName, companyAddress, companyWeb, "Determine if the provide URL is the actual url of the website of this company. Answer in one word: yes/no");
                  if (aiResponse === "yes") {
                    let range = await counter(promptToRange);
                    results.push([companyName, companyAddress, companyWeb, companyWeb, aiResponse, "", "", range]);
                    await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, companyWeb, aiResponse, "", "", range]]);
                  }
                  else {
                    try {
                      const response = await axios(config);
                      let linkFound = false;
                      
                      for (let {link} of response.data.organic) {
                          console.log(link);
                          let promptToRange = `I am a steel detailer working on structural and miscellaneous steel projects.
                          
                          My ideal client is a steel FABRICATOR (not a design or engineering company), who fabricates structural or miscellaneous steel in HIS OWN plant: structural steel, platforms, towers, equipment dunnages, steel supports, new bridge steel and bridge repair steel, stairs and rails, handrails, and guardrails, ladders, gates, bollards, equipment supports.
                          
                          We don't work with steel Erectors or General Contractors unless they provide steel fabrication services similar to listed above. 
                          
                          WE DO NOT work with fabricators who fabricate only Pre-Engineered Metal Buildings, or open web joists, or custom metal products without any items listed above.
                          
                          How relevant is this company to me? Shall I get in touch with them and propose my services?
                          (Rate it from 1 to 10). Answer in only number!
                          
                          Company Website: ${link}`;
                          
                          const isExcluded = excludedDomains.some(domain => link.includes(domain));
                          if (!isExcluded) {
                              let linkOfWeb = link;
                              
                              const aiResponse = await runChat(companyName, companyAddress, link, "Determine if the provide URL is the actual url of the website of this company. Answer in one word: yes/no");
                              
                              if (aiResponse === "yes") {
                                  let range = await counter(promptToRange);
                                  
                                  results.push([companyName, companyAddress, companyWeb, linkOfWeb, aiResponse, "", "", range]);
                                  await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, linkOfWeb, aiResponse, "", "", range]]);
                                  linkFound = true;
                                  break;
                              }                     
                          }
                          await sleep(getRandomNumber(2000, 7000)); 
                      }
                      if (!linkFound && companyWeb !== undefined) {
                          console.log(companyWeb);
                          let promptToRange = `Rate this company on a scale of 1 to 10 based on the following criteria: They must be steel fabricators, not solely involved in design or engineering. Their products should include structural and miscellaneous steel items, such as platforms, towers, equipment supports, bridges, stairs, rails, ladders, gates, bollards, and ornamental metalwork, with mention of these on their website. We do not engage with fabricators focused solely on pre-engineered metal buildings or open web joists. We may also consider steel erectors or general contractors if they offer fabrication services, particularly if they have a dedicated facility or department for this purpose. Company Website: ${companyWeb}`;
                          
                          const isExcluded = excludedDomains.some(domain => companyWeb.includes(domain));
                          if (!isExcluded) {
                              
                              const aiResponse = await runChat(companyName, companyAddress, companyWeb, "Determine if the provided URL is the actual url of the website of this company. Answer in one word: yes/no");
                              
                              if (aiResponse === "yes") {
                                  let range = await counter(promptToRange);
                                  results.push([companyName, companyAddress, companyWeb, companyWeb, aiResponse, "", "", range]);
                                  await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, "page not found", aiResponse, "", "", range]]);
                                  linkFound = true;
                              }                     
                          }
                      }
                      
                      if (!linkFound) {
                          console.log("page not found");
                          searchQuery1 =  `${companyName} ${companyAddress} official linkedin of the company`;
                          let config1 = {
                              method: 'post',
                              url: 'https://google.serper.dev/search',
                              headers: { 
                                  'X-API-KEY': process.env.SERPER_API, 
                                  'Content-Type': 'application/json'
                              },
                              data: JSON.stringify({ "q": searchQuery1 })
                          };
                          try {
                              const responseToLinkedIn = await axios(config1);
                              for (let {link} of responseToLinkedIn.data.organic) {                        
                                  if(link.includes("linkedin.com/company")) {
                                      
                                      const aiResponse1 = await runChat(companyName, companyAddress, link, "Determine if the provide URL is the actual url of the linkedin of this company (not employees). Pay attension to company location. Answer in one word: yes/no");
                                      console.log(link);
                                      results.push([companyName, companyAddress, companyWeb, "page not found", "no", link, aiResponse1]);
                                      await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, "page not found", "no", link, aiResponse1]]);
                                      if (aiResponse1 === "yes" || aiResponse1 === "Yes") {
                                          break; 
                                      }                            
                                  }
                              }
                              
                          } catch (error) {
                              console.error('Ошибка при получении данных на втором цикле:', error);
                          }
                      } 
            
                      await sleep(getRandomNumber(2000, 7000)); 
                  } catch (error) {
                      console.error('Ошибка при получении данных:', error);
                  }
                  }
                  
                  await sleep(getRandomNumber(2000, 7000)); 
                  row++;
                  continue; // Продолжаем со следующей итерацией цикла
              }
              try {
                  const response = await axios(config);
                  let linkFound = false;
                  
                  for (let {link} of response.data.organic) {
                      console.log(link);
                      let promptToRange = `I am a steel detailer working on structural and miscellaneous steel projects.
                      
                      My ideal client is a steel FABRICATOR (not a design or engineering company), who fabricates structural or miscellaneous steel in HIS OWN plant: structural steel, platforms, towers, equipment dunnages, steel supports, new bridge steel and bridge repair steel, stairs and rails, handrails, and guardrails, ladders, gates, bollards, equipment supports.
                      
                      We don't work with steel Erectors or General Contractors unless they provide steel fabrication services similar to listed above. 
                      
                      WE DO NOT work with fabricators who fabricate only Pre-Engineered Metal Buildings, or open web joists, or custom metal products without any items listed above.
                      
                      How relevant is this company to me? Shall I get in touch with them and propose my services?
                      (Rate it from 1 to 10). Answer in only number!
                      
                      Company Website: ${link}`;
                      
                      const isExcluded = excludedDomains.some(domain => link.includes(domain));
                      if (!isExcluded) {
                          let linkOfWeb = link;
                          
                          const aiResponse = await runChat(companyName, companyAddress, link, "Determine if the provide URL is the actual url of the website of this company. Answer in one word: yes/no");
                          
                          if (aiResponse === "yes") {
                              let range = await counter(promptToRange);
                              
                              results.push([companyName, companyAddress, companyWeb, linkOfWeb, aiResponse, "", "", range]);
                              await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, linkOfWeb, aiResponse, "", "", range]]);
                              linkFound = true;
                              break;
                          }                     
                      }
                      await sleep(getRandomNumber(2000, 7000)); 
                  }
                  if (!linkFound && companyWeb !== undefined) {
                      console.log(companyWeb);
                      let promptToRange = `Rate this company on a scale of 1 to 10 based on the following criteria: They must be steel fabricators, not solely involved in design or engineering. Their products should include structural and miscellaneous steel items, such as platforms, towers, equipment supports, bridges, stairs, rails, ladders, gates, bollards, and ornamental metalwork, with mention of these on their website. We do not engage with fabricators focused solely on pre-engineered metal buildings or open web joists. We may also consider steel erectors or general contractors if they offer fabrication services, particularly if they have a dedicated facility or department for this purpose. Company Website: ${companyWeb}`;
                      
                      const isExcluded = excludedDomains.some(domain => companyWeb.includes(domain));
                      if (!isExcluded) {
                          
                          const aiResponse = await runChat(companyName, companyAddress, companyWeb, "Determine if the provided URL is the actual url of the website of this company. Answer in one word: yes/no");
                          
                          if (aiResponse === "yes") {
                              let range = await counter(promptToRange);
                              results.push([companyName, companyAddress, companyWeb, companyWeb, aiResponse, "", "", range]);
                              await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, "page not found", aiResponse, "", "", range]]);
                              linkFound = true;
                          }                     
                      }
                  }
                  
                  if (!linkFound) {
                      console.log("page not found");
                      searchQuery1 =  `${companyName} ${companyAddress} official linkedin of the company`;
                      let config1 = {
                          method: 'post',
                          url: 'https://google.serper.dev/search',
                          headers: { 
                              'X-API-KEY': process.env.SERPER_API, 
                              'Content-Type': 'application/json'
                          },
                          data: JSON.stringify({ "q": searchQuery1 })
                      };
                      try {
                          const responseToLinkedIn = await axios(config1);
                          for (let {link} of responseToLinkedIn.data.organic) {                        
                              if(link.includes("linkedin.com/company")) {
                                  
                                  const aiResponse1 = await runChat(companyName, companyAddress, link, "Determine if the provide URL is the actual url of the linkedin of this company (not employees). Pay attension to company location. Answer in one word: yes/no");
                                  console.log(link);
                                  results.push([companyName, companyAddress, companyWeb, "page not found", "no", link, aiResponse1]);
                                  await writeToSheet(google_sheet_ID, `A${row}`, [[companyName, companyAddress, companyWeb, "page not found", "no", link, aiResponse1]]);
                                  if (aiResponse1 === "yes" || aiResponse1 === "Yes") {
                                      break; 
                                  }                            
                              }
                          }
                          
                      } catch (error) {
                          console.error('Ошибка при получении данных на втором цикле:', error);
                      }
                  } 
        
                  await sleep(getRandomNumber(2000, 7000)); 
               
              } catch (error) {
                  console.error('Ошибка при получении данных:', error);
              }
            
            }
            row++;   
          }
    } catch (error) {
        console.error('Ошибка во время выполнения скрипта:', error);
        await sendFinishSignal(process.env.WEBHOOK);
    }
    await sendFinishSignal(process.env.WEBHOOK);
            
  }
 


 



module.exports.fetchAndProcessData = fetchAndProcessData;
module.exports.sendFinishSignal = sendFinishSignal;