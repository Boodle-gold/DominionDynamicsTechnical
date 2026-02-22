# Baltic Sea Demo For Dominion Dynamics Technical

Hello!
This repo contains the code for the backend and front end of my technical assesment.

The goal of the proejct was to represent, and monitor, live ship traffic in the Baltic sea

# Features:
- Displays live AIS ship data (containing location, speed, heading, etc.)
- Allows for the creation of polygon zones that alert the user using a mailbox-esque system 
when a ship enters and exits a given user defined zone. The zones are able to be named by the user.
- Allows the user to deploy a simulated drone asset that will move to the location of a given ship. It leaves 
from its base on the island of Föglö because that seemed like as good a spot as any to have it spawn.

# Technical details and implementation
<u>Frontend</u>
The frontend uses React and Vite to render the live map and other componenets. 
All user actions that affect the backend are posted via HTTP POST to the Django daphne server.

<u>Backend</u>
The backend uses a Django daphne server to serve the frontend and recieve data from the open source AIS.
It reads and writes data to a SQLite database which stores all port data (which is statically loaded from a csv
the was downloaded from HELCOM). The redis channel layer is for broadcasting the data which the Django server 
ingests to the front end, which then recieves it through established WebSocket connections.

The logic behind this system was that I wanted one way to communicate from the frontend to the backend,
and another way to communicate from the backend to the frontend to enforce modularity for communication.
I have never used Django before and if anything this was an incredibly fun learning experience and I'm glad 
to have been able to get something working. I hope you enjoy and thank you for your consideration.