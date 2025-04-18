import express from "express";
import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";
import { SYSTEM_PROMPT } from "./prompts";
dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));





app.get("/", (req, res) => {
  res.status(200).json({ message: "Health Check" });
});

app.post("/incoming-call", async (req, res) => {
  const {
    From, To, CallSid, CallStatus, Direction,
    CallerCity, CallerState, CallerCountry, CallerZip
  } = req.body;
  const from_number = From.substring(1)
  
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
                description: "gender of the patient",
                type: "string"
              },
              required: true
            },
            {
              name: "age",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                type: "number",
                description: "age of the patient"
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
            },
            {
              name: "appointment_slot",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "The slot of the appointment to be booked",
                type: "string"
              },
              required: true
            },
            
          ],
          staticParameters:[
            {
              "name": "phone",
              "location": "PARAMETER_LOCATION_BODY",
              "value": from_number
            }
          ],
          precomputable: false,
          timeout: "20s",
          http: {
            baseUrlPattern: `${process.env.N8N_APPOINTMENT_URL}`,
            httpMethod: "POST"
          }
        }
      },{
        temporaryTool: {
        modelToolName: "suggest_time",
        description: "Suggests a time slot for the appointment",
        precomputable: false,
        timeout: "20s",
        http: {
          baseUrlPattern: `${process.env.N8N_SUGGESTION_URL}`,
          httpMethod: "POST"
        }
      }

      },
      {
        temporaryTool: {
          modelToolName: "get_appointment",
          description: "Gets the details of the existing appointment",
          precomputable: false,
          timeout: "20s",
          staticParameters: [
            {
              "name": "phone",
              "location": "PARAMETER_LOCATION_BODY",
              "value": from_number
            }
          ],
          http: {
            baseUrlPattern: `${process.env.N8N_GET_APPOINTMENT_URL}`,
            httpMethod: "POST"
          }
        }
      },
      {
        temporaryTool: {
          modelToolName: "edit_appointment",
          description: "Edits the details of the existing appointment",
          precomputable: false,
          timeout: "20s",
          dynamicParameters: [
            {
              name: "id",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "The ID of the appointment to be edited",
                type: "string"
              },
              required: true
            },
            {
              name:"full_name",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "full name of the patient",
                type: "string"
              },
              required: true
            },
            {
              name:"gender",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "gender of the patient",
                type: "string"
              },
              required: true
            },
            {
              name:"age",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "age of the patient",
                type: "number"
              },
              required: true
            },
            {
              name:"symptoms",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "Symptoms the patient is experiencing, summarized and short",
                type: "string"
              },
              required: true
            },
            {
              name:"appointment_slot",
              location: "PARAMETER_LOCATION_BODY",
              schema: {
                description: "The slot of the appointment to be edited",
                type: "string"
              },
              required: true
            }
          ],
          staticParameters: [
            {
              "name": "phone",
              "location": "PARAMETER_LOCATION_BODY",
              "value": from_number
            }
          ],
          http: {
            baseUrlPattern: `${process.env.N8N_EDIT_APPOINTMENT_URL}`,
            httpMethod: "POST"
          }
        }
      }
    ]
    }
  };

  try {
    const response = await axios(options);
    console.log(response.data)
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