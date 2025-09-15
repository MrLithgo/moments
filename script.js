class RampSimulation {
    constructor() {
        // All values in metres
        this.rampLength = 2; // Fixed 2m ramp length
        this.height = 0.2; // 20cm in metres
        this.gateDistance = 1.0; // 1m gate distance
        this.currentTime = 0;
        this.isRunning = false;
        this.startTime = 0;
        this.trialCount = 0;
        this.lastRecordedTime = 0;
        this.rampWidth = 600; // pixels
        this.rampLeft = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateSimulation();
        this.currentTrialSet = 1;
    this.trialTimes = []; // Array to store times for current set
    this.trialsInCurrentSet = 0; // NEW: Count trials within current set
    this.trialCount = 0; // Keep this for total trial count if needed elsewhere
       
    }
    
    initializeElements() {
        this.ramp = document.getElementById('ramp');
        this.car = document.getElementById('car');
        this.gate1 = document.getElementById('gate1');
        this.gate2 = document.getElementById('gate2');
        this.timer = document.getElementById('timer');
        this.status = document.getElementById('status');
        this.heightSlider = document.getElementById('heightSlider');
        this.distanceSlider = document.getElementById('distanceSlider');
        this.heightValue = document.getElementById('heightValue');
        this.distanceValue = document.getElementById('distanceValue');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.clearDataBtn = document.getElementById('clearDataBtn');
        this.dataTableBody = document.getElementById('dataTableBody');
        
        // Set initial slider values
        this.heightSlider.value = this.height * 100; // Convert to cm for slider
        this.distanceSlider.value = this.gateDistance * 100; // Convert to cm for slider
        
        // Update display values
        this.heightValue.textContent = `${this.height.toFixed(2)} m`;
        this.distanceValue.textContent = `${this.gateDistance.toFixed(2)} m`;
        
        // Calculate ramp position
        const simulationArea = document.getElementById('simulationArea');
        const simulationWidth = simulationArea.offsetWidth;
        this.rampLeft = (simulationWidth - this.rampWidth) / 2;
    }
    
    setupEventListeners() {
        this.heightSlider.addEventListener('input', () => {
            this.height = parseInt(this.heightSlider.value) / 100; // Convert cm to m
            this.heightValue.textContent = `${this.height.toFixed(2)} m`;
           this.resetTrialProgress();
            this.updateSimulation();
        });
        
        this.distanceSlider.addEventListener('input', () => {
            this.gateDistance = parseInt(this.distanceSlider.value) / 100; // Convert cm to m
            this.distanceValue.textContent = `${this.gateDistance.toFixed(2)} m`;
           this.resetTrialProgress();
            this.updateSimulation();
        });
        
        this.startBtn.addEventListener('click', () => this.startExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        this.recordBtn.addEventListener('click', () => this.recordData());
        this.clearDataBtn.addEventListener('click', () => this.clearAllData());
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const simulationArea = document.getElementById('simulationArea');
            const simulationWidth = simulationArea.offsetWidth;
            this.rampLeft = (simulationWidth - this.rampWidth) / 2;
            this.updateSimulation();
        });
    }
    
    updateSimulation() {
        // Update ramp angle based on height
        const angle = Math.atan(this.height / this.rampLength) * (180 / Math.PI);
        this.ramp.style.left = `${this.rampLeft}px`;
        this.ramp.style.transform = `rotate(${angle}deg)`;
        
        // Calculate positions along the ramp
       // Calculate positions along the ramp
const gate1Distance = (this.rampLength - this.gateDistance) / 2;
const gate2Distance = gate1Distance + this.gateDistance;

// Get simulation area reference
const simulationArea = document.getElementById('simulationArea');
const rampPixelPosition = (50 / 100) * simulationArea.offsetHeight; // 50% from top

// Calculate positions in pixels - consistent with car positioning
const gate1XPixels = this.rampLeft + (gate1Distance / this.rampLength) * this.rampWidth;
const gate1YPixels = 25 + rampPixelPosition - (gate1Distance / this.rampLength) * (this.height * (this.rampWidth / this.rampLength));

const gate2XPixels = this.rampLeft + (gate2Distance / this.rampLength) * this.rampWidth;
const gate2YPixels = 25 + rampPixelPosition - (gate2Distance / this.rampLength) * (this.height * (this.rampWidth / this.rampLength));

// Position gates vertically
this.gate1.style.left = `${gate1XPixels}px`;
this.gate1.style.bottom = `${gate1YPixels}px`;


this.gate2.style.left = `${gate2XPixels}px`;
this.gate2.style.bottom = `${gate2YPixels}px`;

        
     

const rampTopPosition = 50; // 50% from top (halfway)


// Calculate car position based on ramp angle - consistent with animation
const carXPixels = this.rampLeft;
const carYPixels = 12 +rampPixelPosition - (Math.sin(angle * Math.PI/180) * 40);

this.car.style.left = `${carXPixels}px`;
this.car.style.bottom = `${carYPixels}px`;
this.car.style.transform = `rotate(${angle}deg)`;
     
    }
    
    startExperiment() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.currentTime = 0;
        this.startTime = Date.now();
        this.startBtn.disabled = true;
        this.recordBtn.disabled = true;
        this.status.textContent = 'Car rolling...';
        this.status.className = 'status running';
        
        // Animate car rolling down
        this.animateCar();
    }
    
    animateCar() {
    const startTime = Date.now();
    const gate1Distance = (this.rampLength - this.gateDistance) / 2;
    const gate2Distance = gate1Distance + this.gateDistance;
    const angle = Math.atan(this.height / this.rampLength) * (180 / Math.PI);
    
    // Calculate speed based on height (simple physics approximation)
    const speed = Math.sqrt(2 * 9.81 * this.height); // m/s
    const totalTime = (this.rampLength / speed) * 1000; // ms
    
    let gate1Triggered = false;
    let gate2Triggered = false;
    let timerStarted = false;
    let experimentComplete = false;
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / totalTime, 1);
        
        // Move car along ramp
        const currentDistance = progress * this.rampLength;
        const simulationArea = document.getElementById('simulationArea');
        const rampPixelPosition = (50 / 100) * simulationArea.offsetHeight;
        
        const carXPixels = this.rampLeft + (currentDistance / this.rampLength) * this.rampWidth;
        const carYPixels = 12 + rampPixelPosition - (Math.sin(angle * Math.PI/180) * 40) - (currentDistance / this.rampLength) * (this.height * (this.rampWidth / this.rampLength));
        
        this.car.style.left = `${carXPixels}px`;
        this.car.style.bottom = `${carYPixels}px`;
        this.car.style.transform = `rotate(${angle}deg)`;
        
        // Check light gate triggers
        if (!gate1Triggered && currentDistance >= gate1Distance) {
            gate1Triggered = true;
            timerStarted = true;
            this.gate1.classList.add('active');
            this.startTime = Date.now();
            this.updateTimer();
        }
        
        if (!gate2Triggered && currentDistance >= gate2Distance) {
            gate2Triggered = true;
            this.gate2.classList.add('active');
            this.stopTimer();
            experimentComplete = true;
            // Don't return here - let the animation continue
        }
        
        if (timerStarted && !experimentComplete) {
            this.updateTimer();
        }
        
        // Continue animation until car reaches end of ramp
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    animate();
}
    updateTimer() {
    if (this.isRunning) {
        const actualTime = (Date.now() - this.startTime) / 1000;
        
        // Apply 5% variation to the displayed time
        const variation = 0.05;
        const randomFactor = 1 + (Math.random() * variation * 2 - variation);
        this.currentTime = actualTime * randomFactor;
        
        this.timer.textContent = `${this.currentTime.toFixed(3)} s`;
    }
}
  
 resetTrialProgress() {
    // Simply reset the trial progress without creating a new row
    this.trialsInCurrentSet = 0;
    this.trialTimes = [];
    
    // Update status
    this.status.textContent = 'Parameters changed. Starting new trial set.';
    
    // Reset experiment
    this.resetExperiment();
}
  
stopTimer() {
    this.isRunning = false;
    this.lastRecordedTime = this.currentTime;
    
    this.startBtn.disabled = false;
    this.recordBtn.disabled = false;
    this.status.textContent = `Trial ${this.trialsInCurrentSet + 1}/3 complete! Time: ${this.lastRecordedTime.toFixed(3)}s`;
    this.status.className = 'status ready';
}
    
  resetExperiment() {
    this.isRunning = false;
    this.currentTime = 0;
    this.timer.textContent = '0.000 s';
    this.status.textContent = 'Ready to start';
    this.status.className = 'status ready';
    this.startBtn.disabled = false;
    this.recordBtn.disabled = true; // Disable until a trial is completed
    this.gate1.classList.remove('active');
    this.gate2.classList.remove('active');
  
    this.updateSimulation();
    
    // Don't reset trial data here - only reset when starting a new set
}
    
   recordData() {
    if (this.lastRecordedTime === 0) return;
    
    this.trialsInCurrentSet++;
    this.trialTimes.push(this.lastRecordedTime);
   
    // Create or update the table row after each trial
    this.updateDataTable();
    
    // Update status to show progress
    this.status.textContent = `Recorded trial ${this.trialsInCurrentSet}/3.`;
    
    // If we have 3 trials, finalize the data
    if (this.trialsInCurrentSet === 3) {
        // Reset for next trial set
        this.currentTrialSet++;
        this.trialsInCurrentSet = 0;
        this.trialTimes = [];
        this.recordBtn.disabled = true;
        
        // Reset the experiment for the next set of trials
        this.resetExperiment();
    } else {
        // Reset for the next trial in the current set
        this.resetForNextTrial();
    }
}
  
  updateDataTable() {
    // Find or create the row for current trial set
    let row = document.querySelector(`tr[data-trial-set="${this.currentTrialSet}"]`);
    
    if (!row) {
        // Create new row if it doesn't exist
        row = document.createElement('tr');
        row.setAttribute('data-trial-set', this.currentTrialSet);
        row.innerHTML = `
            <td>${this.currentTrialSet}</td>
            <td>${this.height.toFixed(2)}</td>
            <td>${this.gateDistance.toFixed(2)}</td>
            <td></td><td></td><td></td>
            <td></td>
            <td>
                <input type="number" class="speed-input" placeholder="Enter speed" step="0.01">
                <span>m/s</span>
            </td>
            <td class="validation-cell">
                <i class="validation-icon"></i>
            </td>
        `;
        this.dataTableBody.appendChild(row);
      // Add this line after creating the row

    }
    
    // Update the specific trial cell
    const trialCell = row.cells[2 + this.trialsInCurrentSet]; // Cells 3,4,5 for trials 1,2,3
    trialCell.textContent = this.lastRecordedTime.toFixed(3);
    
    // If all 3 trials are done, calculate and display average
    if (this.trialsInCurrentSet === 3) {
        const averageTime = this.trialTimes.reduce((sum, time) => sum + time, 0) / 3;
        row.cells[6].textContent = averageTime.toFixed(3); // Average cell
        
        // Add event listener to the speed input
        const speedInput = row.querySelector('.speed-input');
        const validationIcon = row.querySelector('.validation-icon');
        
        speedInput.addEventListener('input', () => {
            this.validateSpeedInput(speedInput, validationIcon, averageTime);
        });
    }
}
  resetForNextTrial() {
    // Reset the timer and experiment state but keep trial data
    this.isRunning = false;
    this.currentTime = 0;
    this.timer.textContent = '0.000 s';
    this.startBtn.disabled = false;
    this.recordBtn.disabled = false; // Keep enabled for next trial
    this.gate1.classList.remove('active');
    this.gate2.classList.remove('active');
     
    this.updateSimulation();
}
    
    validateSpeedInput(input, icon, averageTime) {
    const userSpeed = parseFloat(input.value);
    const distance = this.gateDistance;
    
    if (isNaN(userSpeed)) {
        input.classList.remove('correct', 'incorrect');
        icon.className = 'validation-icon';
        return;
    }
    
    // Calculate actual speed using average time
    const actualSpeed = distance / averageTime;
    
    // Check if user's speed matches actual speed to 2 significant figures
    const userRounded = parseFloat(userSpeed.toPrecision(2));
    const actualRounded = parseFloat(actualSpeed.toPrecision(2));
    
    // Allow 5% tolerance for the variation
    const tolerance = 0.05;
    
    if (Math.abs(userRounded - actualRounded) / actualRounded <= tolerance) {
        input.classList.add('correct');
        input.classList.remove('incorrect');
        icon.className = 'validation-icon correct fas fa-check';
    } else {
        input.classList.add('incorrect');
        input.classList.remove('correct');
        icon.className = 'validation-icon incorrect fas fa-times';
    }
}
    
    clearAllData() {
        this.dataTableBody.innerHTML = '';
        this.trialCount = 0;
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new RampSimulation();
});