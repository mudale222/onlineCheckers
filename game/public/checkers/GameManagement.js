"use strict";
const socket = io()


class GameManagement {
    constructor() {
        this.boardManagement = new BoardManagement();
        this.graphics = new Graphics(this.boardManagement.symbolicBoard);
    }

    play() {

        let addEventMouseDownToImg = (img) => {
            img.addEventListener("mousedown", (e) => {
                e.preventDefault();
                mouseDown = true;
                currentImg = img;
                cureentDiv = currentImg.parentNode;
            });
        }

        let addEventsToNewPics = () => {
            imgs = document.querySelectorAll("img");
            for (let i = 0; i < imgs.length; i++) {
                if (imgs[i].classList != "event") {
                    cureentDiv = imgs[i].parentNode;
                    currentImg = imgs[i];
                    addEventMouseDownToImg(imgs[i]);
                    addEventMouseUpImg(imgs[i]);
                    imgs[i].classList = "event";
                }
            }
        }

        let addEventsToButtons = () => {
            document.getElementById("leave room").addEventListener("click", () => {
                leaveRoom()
            });
            document.getElementById("offer draw").addEventListener("click", () => {
                offerDraw()
            });
            document.getElementById("resign game").addEventListener("click", () => {
                resignGame()
            });
        }

        let addEventMouseUpImg = (img) => {
            img.addEventListener("mouseup", (e) => {
                e.preventDefault();
                mouseDown = false;
                console.log("game managmaent id: " + socket.id);

                let elements, from, to;
                try {
                    elements = getAllElementsFromPoint(e.clientX, e.clientY);
                    from = { x: parseInt(cureentDiv.getAttribute("x")), y: parseInt(cureentDiv.getAttribute("y")) };
                    to = { x: elements[1].getAttribute("x"), y: elements[1].getAttribute("y") };
                } catch (ex) {
                    console.log(ex);
                    return;
                }
                currentImg.removeAttribute('style');

                if (elements[1] != null) {
                    socket.emit('isMoveTotalLegal', { from, to }, (legalMoveState) => {
                        if (legalMoveState.is) {

                            this.boardManagement.makeMove(from, to, legalMoveState);

                            if (!legalMoveState.inMiddleSequence.is)
                                this.boardManagement.updateKingsIfNecessary(to);

                            this.graphics.renderMessages(legalMoveState.message);
                            this.graphics.renderPieces();
                            addEventsToNewPics();

                            socket.emit('getEndGameState', false, (endGameState) => {
                                handleEndGame(endGameState);
                            })
                        }
                        else
                            this.graphics.renderMessages(legalMoveState.message);
                    })
                }
                this.graphics.renderPieces();
                addEventsToNewPics();
                // socket.emit('getEndGameState', id, (endGameState) => {
                //     handleEndGame(endGameState);
                // })
            });
        }

        document.onmousemove = (mouseMoveEvent) => {
            mouseMoveEvent.preventDefault();
            if (mouseDown)
                this.graphics.renderMovingMouseDown(currentImg, mouseMoveEvent);
        }

        this.graphics.createAndRenderBoardAndPanel();
        this.graphics.renderPieces();
        let imgs = document.querySelectorAll("img");
        let currentImg, cureentDiv, mouseDown = false;
        addEventsToNewPics();
        addEventsToButtons();
        let board = this.boardManagement.getBoard()
        socket.emit('gameConfigured', { board }, (error) => {
            if (error) {
                alert(error)
                location.href = '/'
            }
        })


        socket.on('opponentMove', ({ from, to, legalMoveState }) => {
            this.boardManagement.makeMove(from, to, legalMoveState);
            if (!legalMoveState.inMiddleSequence.is)
                this.boardManagement.updateKingsIfNecessary(to);
            this.graphics.renderMessages(legalMoveState.message);
            this.graphics.renderPieces();
            addEventsToNewPics();
            socket.emit('getEndGameState', true, (endGameState) => {
                handleEndGame(endGameState);
            })
        })
    }
}


const offerDraw = () => {
    if (confirm("Are u sure u want to offer draw???"))
        socket.emit("offerDraw", () => { })
}

const finishGame = () => {
    socket.emit("leaveGame", () => {
        let white = window.parent.document.getElementById('userColorWhite')
        let black = window.parent.document.getElementById('userColorBlack')
        white ? white.parentNode.removeChild(white) : "";
        black ? black.parentNode.removeChild(black) : "";
        parent.removeIframe()
    })
}

const resignGame = () => {
    if (confirm("Are u sure u want to resign?????")) {
        socket.emit("resign", (endGameState) => { handleEndGame(endGameState) })
    }
}

const leaveRoom = () => {
    if (confirm("Are u sure u want to leave???"))
        finishGame()
}

const handleEndGame = (endGameState) => {
    let isBlack = false
    if (window.parent.document.getElementById('userColorBlack'))
        isBlack = true

    if (endGameState.resign) {
        if (endGameState.isBlack != isBlack)
            alert("Congrat! ur opponent is a pussy!! Resign is 4 the weak! You win!!!")
        else
            alert("Pussy! u lost!")
        finishGame()
    } else if (endGameState.left && !endGameState.resign) {
        alert("Unfortunately your opponents left the room :(")
        finishGame()
    }
    else if (endGameState.win) {
        alert(endGameState.isBlack ? "Black WON!!" : "Red WON!!!");
        finishGame()
    } else if (endGameState.isDraw) {
        alert("DRAW!!!");
        finishGame()
    }
}

socket.on('endGameUpdate', (endGameState) => {
    handleEndGame(endGameState)
})

socket.on('opponentAsk4Draw', (callback) => {
    if (confirm("Your opponents ask for draw!! confirm???"))
        socket.emit('resToDraw', true)
    else
        socket.emit('resToDraw', false)
})

socket.on('opponentDrawRes', (endGameState) => {
    if (endGameState.isDraw)
        handleEndGame(endGameState)
    else
        alert("Unfortunately your opponets don't give a shit about u and decline your offer to draw...")
})

socket.on('error', (errorMsg) => {
    location.href = '/transferPage.html?msg=' + errorMsg
})
socket.on('err', (errorMsg) => {
    location.href = '/transferPage.html?msg=' + errorMsg
})
