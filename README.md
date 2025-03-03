# Victor - Connect for Tasks

A platform that connects people who need tasks done with those who can help.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- NPM (v7 or higher)

### Installation

1. Clone this repository or download it to your local machine
2. Open a terminal/command prompt and navigate to the project folder
3. Install the required dependencies:

```bash
npm install
```

### Running the API Server

Start the API server with:

```bash
npm start
```

The server will run on http://localhost:9000 by default.

### Running the Web Application

The web application is static HTML/CSS/JS, so you can simply open any of the HTML files in your browser. For the best experience, you should serve the files using a local web server.

You can use any of these options:

#### Using Node.js http-server
```bash
npx http-server -p 8080
```

#### Using Python's built-in server
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

Then open your browser and go to http://localhost:8080

## Features

- User authentication (sign up/login)
- Task posting and browsing
- Task acceptance and completion tracking
- User profiles
- Responsive design for mobile and desktop

## Implementation Details

The application uses:

- HTML, CSS (Tailwind CSS), and JavaScript for the frontend