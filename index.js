const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Enable CORS for external access
app.use(cors());

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/', // Temporary storage for uploaded files
});

// In-memory array to store file details (you could also use a database)
let uploadedFiles = [];

// Endpoint to upload multiple PDFs
app.post('/upload', upload.array('pdfs', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    // Ensure all uploaded files are PDFs
    for (const file of req.files) {
        const fileType = file.mimetype;
        if (fileType !== 'application/pdf') {
            fs.unlinkSync(file.path);
            return res.status(400).send('Only PDF files are allowed.');
        }
    }

    // Store the file details (filename and upload time)
    req.files.forEach(file => {
        uploadedFiles.push({
            filename: file.filename,
            uploadTime: Date.now(),
        });
    });

    // Respond with the uploaded file's details and the total number of files uploaded
    const fileDetails = req.files.map(file => ({
        message: 'File uploaded successfully.',
        filename: file.filename,
    }));

    const FileNumber = fileDetails.length;  // Total number of files uploaded

    res.send({ fileDetails, FileNumber });
});

// Endpoint to retrieve the uploaded PDF file
app.get('/get-pdf/:filename', (req, res) => {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename); // Decode the filename
    const filePath = path.join(__dirname, 'uploads', decodedFilename); // Join path with decoded filename

    console.log("Looking for file at: ", filePath); // Log the file path for debugging

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found.');
    }

    // Send the file to the client
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error sending file.');
        }
    });
});

// Endpoint to retrieve the recently uploaded PDF files (slice by FileNumber)
app.get('/get-recent-pdfs', (req, res) => {
    if (uploadedFiles.length === 0) {
        return res.status(404).send('No PDF files found.');
    }

    // Sort the uploaded files based on upload time (most recent first)
    const recentFiles = uploadedFiles.sort((a, b) => b.uploadTime - a.uploadTime);

    // Get the FileNumber from the query string (defaults to all uploaded files if not provided)
    const fileNumber = parseInt(req.query.FileNumber) || recentFiles.length; // Default to all if not provided

    // Slice the recent files based on FileNumber (to limit the number of files)
    const recentFilesToSend = recentFiles.slice(0, fileNumber);

    // Return the recently uploaded files
    res.json(recentFilesToSend);
});

// Start the server
const PORT = process.env.PORT || 3000;  // Use Heroku port or 3000 locally
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
