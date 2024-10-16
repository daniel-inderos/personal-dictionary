let words = [];
let currentWordIndex = 0;
let userResponses = {};
let remainingWords = [];
let isDarkMode = false;

// Add these variables at the beginning of your file
let canvas, ctx, particles;
let animationEnabled = true;
let userName = '';

// Add this function to handle the onboarding process
function showOnboarding() {
    const onboardingHTML = `
        <div id="onboarding">
            <h2>Welcome to Your Personal Dictionary!</h2>
            <p>Let's get started by personalizing your experience.</p>
            <input type="text" id="user-name-input" placeholder="Enter your name">
            <button id="start-dictionary">Start My Dictionary</button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', onboardingHTML);
    
    document.getElementById('start-dictionary').addEventListener('click', () => {
        userName = document.getElementById('user-name-input').value.trim();
        if (userName) {
            localStorage.setItem('userName', userName);
            document.getElementById('onboarding').remove();
            initializeDictionary();
        } else {
            alert('Please enter your name to continue.');
        }
    });
}

// Modify the fetchWords function to call showOnboarding if needed
async function fetchWords() {
    userName = localStorage.getItem('userName');
    if (!userName) {
        showOnboarding();
        return;
    }
    
    try {
        const response = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt');
        const text = await response.text();
        const commonWords = new Set([
            'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 
            'about', 'into', 'over', 'after', 'be', 'is', 'am', 'are', 'was', 'were', 'has', 'have', 
            'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 
            'must', 'ought', 'that', 'this', 'these', 'those', 'it', 'they', 'them', 'their', 'what', 
            'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 
            'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 
            'than', 'too', 'very', 'just', 'but', 'however', 'still', 'yet'
        ]);

        let filteredWords = text.split('\n').filter(word => {
            return word.length >= 5 && word.length <= 12 && !commonWords.has(word.toLowerCase());
        });

        // Remove plural forms if singular exists
        const wordSet = new Set(filteredWords);
        words = filteredWords.filter(word => {
            if (word.endsWith('s')) {
                const singular = word.slice(0, -1);
                if (wordSet.has(singular)) {
                    return false;
                }
            }
            return true;
        });

        words = words.slice(0, 1000); // Limit to first 1000 words after filtering
        loadUserResponses();
        updateRemainingWords();
        displayCurrentWord();
        setupCanvas();
        animateParticles();
    } catch (error) {
        console.error('Error fetching words:', error);
    }
}

function updateRemainingWords() {
    remainingWords = words.filter(word => !userResponses.hasOwnProperty(word));
    if (remainingWords.length === 0) {
        alert("Congratulations! You've completed all the words.");
        // Optionally, you could reset the dictionary here
        // userResponses = {};
        // localStorage.removeItem('userResponses');
        // updateRemainingWords();
    }
    currentWordIndex = 0;
}

async function displayCurrentWord() {
    if (remainingWords.length === 0) {
        document.getElementById('word-display').textContent = "No more words!";
        document.getElementById('user-definition').value = '';
        document.getElementById('user-definition').placeholder = 'You have defined all words';
        document.querySelector('.word-type').textContent = '';
        return;
    }
    
    const currentWord = remainingWords[currentWordIndex];
    const wordDisplay = document.getElementById('word-display');
    const wordTypeDisplay = document.querySelector('.word-type');
    
    // Add fade-out effect
    wordDisplay.style.opacity = '0';
    wordTypeDisplay.style.opacity = '0';
    
    setTimeout(async () => {
        wordDisplay.textContent = currentWord;
        const wordType = await fetchWordDetails(currentWord);
        wordTypeDisplay.textContent = wordType;
        
        // Add fade-in effect
        wordDisplay.style.opacity = '1';
        wordTypeDisplay.style.opacity = '1';
    }, 300);
    
    const userDefinition = document.getElementById('user-definition');
    userDefinition.value = '';
    userDefinition.placeholder = 'Enter your definition';
}

async function nextWord() {
    currentWordIndex = (currentWordIndex + 1) % remainingWords.length;
    await displayCurrentWord();
}

async function prevWord() {
    currentWordIndex = (currentWordIndex - 1 + remainingWords.length) % remainingWords.length;
    await displayCurrentWord();
}

function saveUserResponse(response) {
    const currentWord = remainingWords[currentWordIndex];
    userResponses[currentWord] = response;
    localStorage.setItem('userResponses', JSON.stringify(userResponses));
    updateRemainingWords();
    updateProgressBar(); // Add this line
}

function loadUserResponses() {
    const savedResponses = localStorage.getItem('userResponses');
    if (savedResponses) {
        userResponses = JSON.parse(savedResponses);
        updateProgressBar(); // Add this line
    }
}

async function downloadDictionary() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set colors similar to the website
    const textColor = isDarkMode ? '#ecf0f1' : '#333';
    const primaryColor = '#3498db';
    const secondaryColor = '#2ecc71';
    const bgColor = isDarkMode ? '#2c3e50' : '#f0f0f0';
    
    // Add background
    doc.setFillColor(bgColor);
    doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
    
    // Title
    doc.setFontSize(36);
    doc.setTextColor(secondaryColor);
    doc.text(`${userName}'s Personal Dictionary`, 105, 30, null, null, "center");
    
    let yPosition = 60;
    
    for (const word in userResponses) {
        if (userResponses[word] !== 'skipped') {
            if (yPosition > 250) {
                doc.addPage();
                doc.setFillColor(bgColor);
                doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
                yPosition = 20;
            }
            
            // Word
            doc.setFontSize(24);
            doc.setTextColor(primaryColor);
            doc.text(word, 20, yPosition);
            
            // Fetch word type
            const wordType = await fetchWordDetails(word);
            
            // Word type
            doc.setFontSize(14);
            doc.setTextColor(textColor);
            doc.text(wordType, 20, yPosition + 10);
            
            // Definition
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(userResponses[word], 170);
            doc.text(lines, 20, yPosition + 20);
            
            // Add a subtle line between entries
            doc.setDrawColor(primaryColor);
            doc.setLineWidth(0.5);
            doc.line(20, yPosition + 30 + (lines.length * 5), 190, yPosition + 30 + (lines.length * 5));
            
            yPosition += 40 + (lines.length * 5);
        }
    }
    
    doc.save("my_dictionary.pdf");
}

document.getElementById('next-word').addEventListener('click', () => nextWord());
document.getElementById('prev-word').addEventListener('click', () => prevWord());

document.getElementById('submit-definition').addEventListener('click', async () => {
    const userDefinition = document.getElementById('user-definition').value;
    if (userDefinition.trim() !== '') {
        saveUserResponse(userDefinition);
        if (remainingWords.length > 0) {
            await displayCurrentWord();
        }
    } else {
        alert('Please enter a definition or skip this word.');
    }
});

document.getElementById('skip-word').addEventListener('click', async () => {
    saveUserResponse('skipped');
    if (remainingWords.length > 0) {
        await displayCurrentWord();
    }
});

document.getElementById('download-dictionary').addEventListener('click', async () => {
    const downloadButton = document.getElementById('download-dictionary');
    downloadButton.textContent = 'Generating PDF...';
    downloadButton.disabled = true;
    
    await downloadDictionary();
    
    downloadButton.textContent = 'Download My Dictionary';
    downloadButton.disabled = false;
});

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

fetchWords();

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    if (animationEnabled) {
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    }
}

isDarkMode = localStorage.getItem('darkMode') === 'true';
document.body.classList.toggle('dark-mode', isDarkMode);

// Add this new event listener near the other event listeners in your app.js file

document.getElementById('user-definition').addEventListener('keyup', async (event) => {
    if (event.key === 'Enter') {
        const userDefinition = event.target.value;
        if (userDefinition.trim() !== '') {
            saveUserResponse(userDefinition);
            if (remainingWords.length > 0) {
                await displayCurrentWord();
            }
        } else {
            alert('Please enter a definition or skip this word.');
        }
    }
});

// Add these event listeners at the end of your file
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

document.getElementById('toggle-animation').addEventListener('click', toggleAnimation);

// Add this function to set up the canvas and particles
function setupCanvas() {
    canvas = document.getElementById('background-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];

    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 2,  // Increased from 0.5 to 2
            dy: (Math.random() - 0.5) * 2   // Increased from 0.5 to 2
        });
    }
}

// Add this function to animate the particles
function animateParticles() {
    if (!animationEnabled) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';

    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.dx;
        particle.y += particle.dy;

        if (particle.x < 0 || particle.x > canvas.width) particle.dx = -particle.dx;
        if (particle.y < 0 || particle.y > canvas.height) particle.dy = -particle.dy;
    });

    requestAnimationFrame(animateParticles);
}

// Add this function to toggle the animation
function toggleAnimation() {
    animationEnabled = !animationEnabled;
    if (animationEnabled) {
        animateParticles();
    }
}

async function fetchWordDetails(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();
        if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
            return data[0].meanings[0].partOfSpeech;
        }
    } catch (error) {
        console.error('Error fetching word details:', error);
    }
    return 'unknown';
}

// Add this function to initialize the dictionary after onboarding
function initializeDictionary() {
    fetchWords();
}

// Add this function to update the progress bar
function updateProgressBar() {
    const totalWords = words.length;
    const definedWords = Object.keys(userResponses).length;
    const progress = (definedWords / totalWords) * 100;
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${definedWords} / ${totalWords} words defined`;
}
