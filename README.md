Project Title
Cipher Quest: A Real-Time Gamified Web Application for Cryptographic Concept Mastery and Algorithmic Problem Solving

Project Description
Cipher Quest is an educational, noir-themed detective web application designed to teach players classical cryptography. It transforms the learning of historical ciphers from a dry academic exercise into an engaging, gamified experience.

The system features:

An interactive 2D Story Mode where players explore crime scenes and solve ciphers to catch the culprit.

Time Attack Mode for solo timed challenges.

Real-Time Multiplayer for live 1v1 cipher-solving races.

Artificial Intelligence integration (Google Gemini) for generating infinite, context-aware puzzles on the fly.

Machine Learning (Python/Scikit-Learn) to predict player skill tiers and dynamically adjust puzzle difficulty based on historical accuracy.

Group Members
Furio, Adlerson Austin

Imson, Justine Rheggie

Mendoza, Grypson

Technologies Used
Frontend Layer: React 19, Vite, Tailwind CSS v4, Zustand

Game Engine: Phaser 4 (with Matter.js physics)

Backend & Identity Layer: Firebase (Authentication, Firestore NoSQL Database)

Real-Time Multiplayer: Node.js, Socket.IO

Machine Learning API: Python, Flask, Pandas, Scikit-Learn

Generative Text AI: @google/generative-ai SDK (Google Gemini 2.5 Flash)

Installation Instructions
Prerequisites
Node.js (v18+)

Python 3.8+

A Firebase Project with Authentication and Firestore enabled

A Google Gemini API Key

Step-by-Step Setup
Clone the repository:

Bash
git clone https://github.com/JustineImson/cipher-quest.git
cd cipher-quest
Install Node dependencies:

Bash
npm install
Install Python dependencies:

Bash
cd python-api
pip install -r requirements.txt
cd ..
Environment Variables:
Rename .env.example to .env in the root directory and fill in your API keys and Firebase config:

Code snippet
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_GEMINI_API_KEY=your_gemini_key
Run the Application Locally:
Execute the following command to concurrently run the React frontend, Node.js multiplayer server, and Python Flask ML API:

Bash
npm run dev
Frontend: http://localhost:5173

Socket.IO Server: http://localhost:3001

Python API: http://localhost:5000

Deployment Link
https://cipher-quest.duckdns.org/
