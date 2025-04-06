import express from "express";
import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";
import { SYSTEM_PROMPT } from "./prompts";
dotenv.config();

const app = express();





app.get("/", (req, res) => {
  res.status(200).json({ message: "Health Check" });
});

app.post("/incoming-call", async (req, res) => {
  console.log("Incoming call data:", req.query);
  const options = {
    method: 'POST',
    url: 'https://api.ultravox.ai/api/calls',
    headers: { 'X-API-Key': `${process.env.ULTRAVOX_API}`, 'Content-Type': 'application/json' },
    data: {
      systemPrompt: SYSTEM_PROMPT,
      model: "fixie-ai/ultravox-70B",
      voice: "Deobra",
      temperature: 0.2,
      medium: {
        "twilio": {}
      },
      firstSpeaker: "FIRST_SPEAKER_AGENT",
      selectedTools: [ { //doesnt end the call on twilio's end
        "temporaryTool":{
          "modelToolName":"hangUp",
          "description":"End the call",
          "client":{}
        }
      }, {
        temporaryTool: {
          modelToolName: "appointment",
          description: "Books an appointment for the patient using the day and time they provided",
          dynamicParameters: [
            {
              name: "full_name",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "Full name of the patient",
                type: "string"
              },
              required: true
            },
            {
              name: "gender",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "Gender of the patient (Male or Female)",
                type: "string"
              },
              required: true
            },
            {
              name: "age",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                type: "number",
                description: "Age of the patient"
              },
              required: true
            },
            {
              name: "symptoms",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "Symptoms the patient is experiencing, summarized and short",
                type: "string"
              },
              required: true
            }
          ],
          precomputable: true,
          http: {
            baseUrlPattern: `${process.env.N8N_WEBHOOK_URL}`,
            httpMethod: "POST"
          }
        }
      }
    ]
    }
  };

  try {
    const response = await axios(options);
    const joinUrl = response.data.joinUrl;

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.connect().stream({ url: joinUrl });
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error("Error connecting call:", error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We are experiencing technical difficulties. Please try again later.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});