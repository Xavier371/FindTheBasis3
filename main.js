document.addEventListener('DOMContentLoaded', (event) => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.style.touchAction = 'none';

    // Responsive canvas sizing
    function resizeCanvas() {
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        canvas.width = size;
        canvas.height = size;
        origin = { x: canvas.width / 2, y: canvas.height / 2 };
        unitSize = Math.min(canvas.width, canvas.height) / 20;
        if (gameStarted && !isPaused) {
            draw();
        }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Game state variables
    let origin = { x: canvas.width / 2, y: canvas.height / 2 };
    let unitSize = Math.min(canvas.width, canvas.height) / 20;
    const initialUnitVectorX = { x: unitSize, y: 0 };
    const initialUnitVectorY = { x: 0, y: -unitSize };
    let unitVectorX = { ...initialUnitVectorX };
    let unitVectorY = { ...initialUnitVectorY };

    // Control variables
    let dragging = null;
    let moveCounter = 0;
    let gameWon = false;
    let gameStarted = false;
    let timer = null;
    let elapsedTime = 0;
    let isPaused = false;
    let isShowingInstructions = false;
    let isShowingSolution = false;

        function getRandomPoint() {
        const min = -5;
        const max = 5;
        let x, y;
        do {
            x = Math.floor(Math.random() * (max - min + 1)) + min;
            y = Math.floor(Math.random() * (max - min + 1)) + min;
        } while ((x === 1 && y === 0) || (x === 0 && y === 1));
        return { x, y };
    }

    function hasIntegerSolution(bluePoint, redPoint) {
        const [b1, b2] = [bluePoint.x, bluePoint.y];
        const [r1, r2] = [redPoint.x, redPoint.y];
        let bestSolution = null;
        let minSum = Infinity;

        for (let a = -6; a <= 6; a++) {
            for (let b = -6; b <= 6; b++) {
                const x1 = a * b1 + b * b2;
                for (let c = -6; c <= 6; c++) {
                    for (let d = -6; d <= 6; d++) {
                        const x2 = c * b1 + d * b2;
                        if (x1 === r1 && x2 === r2) {
                            const sum = Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d);
                            if (sum < minSum) {
                                minSum = sum;
                                bestSolution = { a, b, c, d };
                            }
                        }
                    }
                }
            }
        }
        return bestSolution;
    }

    function generateValidPoints() {
        let bluePoint, redPoint, solution;
        do {
            bluePoint = getRandomPoint();
            redPoint = getRandomPoint();
            solution = hasIntegerSolution(bluePoint, redPoint);
        } while (bluePoint.x === redPoint.x && bluePoint.y === redPoint.y || !solution);
        return { bluePoint, redPoint, solution };
    }

    let { bluePoint, redPoint, solution } = generateValidPoints();
        function gridToCanvas(point) {
        return {
            x: origin.x + point.x * unitSize,
            y: origin.y - point.y * unitSize
        };
    }

    function canvasToGrid(point) {
        return {
            x: Math.round((point.x - origin.x) / unitSize),
            y: Math.round((origin.y - point.y) / unitSize)
        };
    }

    function drawGrid() {
        if (isShowingInstructions || isShowingSolution) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'lightgray';
        
        for (let i = -10; i <= 10; i++) {
            const linePos = i * unitSize;
            ctx.beginPath();
            ctx.moveTo(origin.x + linePos, 0);
            ctx.lineTo(origin.x + linePos, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, origin.y + linePos);
            ctx.lineTo(canvas.width, origin.y + linePos);
            ctx.stroke();
        }
    }

    function drawAxes() {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(canvas.width, origin.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, canvas.height);
        ctx.stroke();

        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText('X', canvas.width - 20, origin.y - 10);
        ctx.fillText('Y', origin.x + 10, 20);
    }
        function drawArrow(start, end, color, label = '') {
        const headLength = unitSize / 5;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (label) {
            ctx.font = '16px Arial';
            ctx.fillStyle = color;
            ctx.fillText(label, end.x + 5, end.y - 5);
        }
    }

    function drawPoints() {
        const redCanvasPoint = gridToCanvas(redPoint);
        ctx.beginPath();
        ctx.arc(redCanvasPoint.x, redCanvasPoint.y, unitSize/10, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();

        const blueCanvasPoint = gridToCanvas(bluePoint);
        ctx.beginPath();
        ctx.arc(blueCanvasPoint.x, blueCanvasPoint.y, unitSize/10, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();

        drawArrow(origin, blueCanvasPoint, 'blue');
    }

    function drawTransformedVector() {
        const A = [
            [(unitVectorX.x / unitSize), (unitVectorY.x / unitSize)],
            [(-unitVectorX.y / unitSize), (-unitVectorY.y / unitSize)]
        ];

        const transformedBluePoint = {
            x: (A[0][0] * bluePoint.x) + (A[0][1] * bluePoint.y),
            y: (A[1][0] * bluePoint.x) + (A[1][1] * bluePoint.y)
        };

        const transformedBlueCanvasPoint = gridToCanvas(transformedBluePoint);
        ctx.beginPath();
        ctx.arc(transformedBlueCanvasPoint.x, transformedBlueCanvasPoint.y, unitSize/10, 0, Math.PI * 2);
        ctx.fillStyle = 'lightblue';
        ctx.fill();

        drawArrow(origin, transformedBlueCanvasPoint, 'lightblue');
        checkWinCondition(transformedBluePoint);
    }
        function checkWinCondition(transformedPoint) {
        if (Math.round(transformedPoint.x) === redPoint.x && 
            Math.round(transformedPoint.y) === redPoint.y) {
            gameWon = true;
            stopTimer();
            document.getElementById('winMessage').innerText = 
                `Congratulations! You won in ${moveCounter} moves and ${elapsedTime} seconds!`;
            disableButtonsAfterWin();
        }
    }

    function draw() {
        if (isShowingInstructions || isShowingSolution) return;
        drawGrid();
        drawAxes();
        drawArrow(origin, 
                 { x: origin.x + initialUnitVectorX.x, y: origin.y + initialUnitVectorX.y }, 
                 'black', 'i');
        drawArrow(origin, 
                 { x: origin.x + initialUnitVectorY.x, y: origin.y + initialUnitVectorY.y }, 
                 'black', 'j');

        const labelIX = (unitVectorX.x !== initialUnitVectorX.x || 
                        unitVectorX.y !== initialUnitVectorX.y) ? "i'" : '';
        const labelJY = (unitVectorY.x !== initialUnitVectorY.x || 
                        unitVectorY.y !== initialUnitVectorY.y) ? "j'" : '';
        
        drawArrow(origin, 
                 { x: origin.x + unitVectorX.x, y: origin.y + unitVectorX.y }, 
                 'green', labelIX);
        drawArrow(origin, 
                 { x: origin.x + unitVectorY.x, y: origin.y + unitVectorY.y }, 
                 'green', labelJY);
        drawPoints();
    }

    function handlePointerMove(event) {
        event.preventDefault();
        if (dragging && !isPaused) {
            const rect = canvas.getBoundingClientRect();
            let x, y;
            
            if (event.type === 'touchmove') {
                x = event.touches[0].clientX - rect.left;
                y = event.touches[0].clientY - rect.top;
            } else {
                x = event.clientX - rect.left;
                y = event.clientY - rect.top;
            }

            const gridPoint = canvasToGrid({ x, y });
            const snappedX = Math.round(gridPoint.x) * unitSize;
            const snappedY = Math.round(gridPoint.y) * -unitSize;

            if (dragging === 'unitVectorX') {
                unitVectorX = { x: snappedX, y: snappedY };
            } else if (dragging === 'unitVectorY') {
                unitVectorY = { x: snappedX, y: snappedY };
            }

            draw();
        }
    }
        function isOnVector(point, vector) {
        const vectorPoint = { x: origin.x + vector.x, y: origin.y + vector.y };
        const distance = Math.sqrt(
            (point.x - vectorPoint.x) ** 2 + 
            (point.y - vectorPoint.y) ** 2
        );
        return distance < unitSize/5;
    }

    function handlePointerStart(event) {
        event.preventDefault();
        if (gameWon || isPaused) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if (event.type === 'touchstart') {
            x = event.touches[0].clientX - rect.left;
            y = event.touches[0].clientY - rect.top;
        } else {
            x = event.clientX - rect.left;
            y = event.clientY - rect.top;
        }

        const clickPoint = { x, y };

        if (isOnVector(clickPoint, unitVectorX)) {
            dragging = 'unitVectorX';
        } else if (isOnVector(clickPoint, unitVectorY)) {
            dragging = 'unitVectorY';
        }
    }

    function handlePointerEnd() {
        dragging = null;
    }

    // Event Listeners
    canvas.addEventListener('mousedown', handlePointerStart);
    canvas.addEventListener('touchstart', handlePointerStart);
    canvas.addEventListener('mousemove', handlePointerMove);
    canvas.addEventListener('touchmove', handlePointerMove);
    canvas.addEventListener('mouseup', handlePointerEnd);
    canvas.addEventListener('touchend', handlePointerEnd);

    // Timer Functions
    function startTimer() {
        if (!timer) {
            timer = setInterval(() => {
                if (!isPaused) {
                    elapsedTime += 1;
                    document.getElementById('timer').innerText = `Timer: ${elapsedTime} seconds`;
                }
            }, 1000);
        }
    }

    function stopTimer() {
        clearInterval(timer);
        timer = null;
    }

    // Button Event Handlers
    document.getElementById('howToPlayButton').addEventListener('click', toggleInstructions);
    document.getElementById('backToGameButton').addEventListener('click', toggleInstructions);
    document.getElementById('solveButton').addEventListener('click', toggleSolution);
    document.getElementById('backFromSolutionButton').addEventListener('click', toggleSolution);

    function toggleInstructions() {
        isShowingInstructions = !isShowingInstructions;
        const overlay = document.getElementById('instructionsOverlay');
        overlay.style.display = isShowingInstructions ? 'flex' : 'none';
        if (!isShowingInstructions) {
            draw();
        }
    }

    function toggleSolution() {
        isShowingSolution = !isShowingSolution;
        const overlay = document.getElementById('solutionOverlay');
        if (isShowingSolution) {
            isPaused = true;
            const solutionContent = document.getElementById('solutionContent');
            solutionContent.innerHTML = `
                <h2>Solution</h2>
                <p>The transformation matrix is:</p>
                \\[ \\begin{bmatrix} ${solution.a} & ${solution.b} \\\\ ${solution.c} & ${solution.d} \\end{bmatrix} \\]
                <p>This means:</p>
                <p>i' maps to (${solution.a}, ${solution.c})</p>
                <p>j' maps to (${solution.b}, ${solution.d})</p>
            `;
            MathJax.typeset();
        } else {
            isPaused = false;
            draw();
        }
        overlay.style.display = isShowingSolution ? 'flex' : 'none';
    }

    document.getElementById('goButton').addEventListener('click', () => {
        if (gameWon || isShowingInstructions || isShowingSolution) return;
        if (!gameStarted) {
            gameStarted = true;
            draw();
            startTimer();
        }
        moveCounter += 1;
        document.getElementById('moveCounter').innerText = moveCounter;
        drawTransformedVector();
    });

    document.getElementById('resetButton').addEventListener('click', () => {
        const points = generateValidPoints();
        bluePoint = points.bluePoint;
        redPoint = points.redPoint;
        solution = points.solution;
        unitVectorX = { ...initialUnitVectorX };
        unitVectorY = { ...initialUnitVectorY };
        moveCounter = 0;
        gameWon = false;
        gameStarted = false;
        elapsedTime = 0;
        isPaused = false;
        isShowingInstructions = false;
        isShowingSolution = false;
        
        document.getElementById('goButton').disabled = false;
        document.getElementById('pauseButton').disabled = false;
        document.getElementById('moveCounter').innerText = moveCounter;
        document.getElementById('winMessage').innerText = '';
        document.getElementById('timer').innerText = `Timer: ${elapsedTime} seconds`;
        document.getElementById('instructionsOverlay').style.display = 'none';
        document.getElementById('solutionOverlay').style.display = 'none';
        
        draw();
        stopTimer();
        startTimer();
    });

    document.getElementById('pauseButton').addEventListener('click', () => {
        if (!gameWon) {
            togglePause();
        }
    });

    function togglePause() {
        if (gameWon) return;
        isPaused = !isPaused;
        document.getElementById('pauseButton').innerText = isPaused ? 'Resume' : 'Pause';
        if (isPaused) {
            stopTimer();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            drawAxes();
        } else {
            startTimer();
            draw();
        }
    }

    function disableButtonsAfterWin() {
        document.getElementById('goButton').disabled = true;
        document.getElementById('pauseButton').disabled = true;
    }

    // Initialize game
    draw();
    startTimer();
});
