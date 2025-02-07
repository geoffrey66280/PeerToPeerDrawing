(function () {
    const canvaSave = document.getElementById("save-canva");
    let drawing = false;
    let canvas = document.getElementById("canva");
    const ctx = canvas.getContext("2d");
    let canvasColor = document.getElementById("color");
    const lineWidth = document.getElementById("line-width");
    ctx.strokeStyle = "#FF00000";
    ctx.lineWidth = 3;
    let peer = new Peer(null, { debug: 2 });
    let conn = null;
    let peerIdInput = document.getElementById("peerIdInput");
    let connectButton = document.getElementById("connectButton");
    let recvId = document.getElementById("receiver-id");
    let status = document.getElementById("status");
    let message = document.getElementById("message");
    let sendMessageBox = document.getElementById("sendMessageBox");
    let sendButton = document.getElementById("sendButton");
    let clearMsgsButton = document.getElementById("clearMsgsButton");

    function initialize() {
        peer.on('open', function(id) {
            recvId.innerHTML = "ID: " + id;
            status.innerHTML = "Awaiting connection...";
        });

        peer.on('connection', function (c) {
            if (conn && conn.open) {
                c.on('open', function() {
                    c.send("Already connected to another client");
                    setTimeout(function() { c.close(); }, 500);
                });
                return;
            }

            conn = c;
            status.innerHTML = "Connected";
            ready();
        });

        peer.on('disconnected', function () {
            status.innerHTML = "Connection lost. Please reconnect";
            peer.reconnect();
        });

        peer.on('close', function() {
            conn = null;
            status.innerHTML = "Connection destroyed. Please refresh";
        });

        peer.on('error', function (err) {
            alert('' + err);
        });
    };

    connectButton.addEventListener('click', function() {
        let peerId = peerIdInput.value;
        peerIdInput.value = "";
        if (peerId) {
            conn = peer.connect(peerId);
            conn.on('open', function () {
                status.innerHTML = "Connected";
                ready();
            });
            conn.on('error', function(err) {
                console.log("Erreur de connexion : ", err);
            });
        }
    });

    function ready() {
        conn.on('data', function (data) {
            let event = data.event;
            switch (event) {
                case 'message':
                    addMessage("<span class=\"peerMsg\">OherUser: </span>" + data.message);
                    break;
                case 'mouseDown':
                    beginCanvas(data.values[0], data.values[1], false, data.color, data.width);
                    break;
                case 'mouseMove':
                    moveCanvas(data.values[0], data.values[1], false, data.color, data.width);
                    break;
                case 'mouseUpOrLeave':
                    ctx.closePath();
                    drawing = false;
                    break;
            };
        });
        conn.on('close', function () {
            status.innerHTML = "Connection reset<br>Awaiting connection...";
            conn = null;
        });
    }

    function beginCanvas(x, y, me, color, width) {
        let beforeCtx = ctx.strokeStyle;
        let beforeCtxWidth = ctx.lineWidth;

        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = beforeCtxWidth;
        ctx.strokeStyle = beforeCtx;
        if(me) {
            conn.send({"event": "mouseDown", "values": [x, y], "color": ctx.strokeStyle, "width": ctx.lineWidth});
        }
    }

    function moveCanvas(x, y, me, color, width) {
        if (!drawing) return;
        let beforeCtxWidth = ctx.lineWidth;
        let beforeCtx = ctx.strokeStyle;

        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.lineWidth = beforeCtxWidth;
        ctx.strokeStyle = beforeCtx;
        if(me) {
            conn.send({"event": "mouseMove", "values": [x, y], "color": ctx.strokeStyle, "width": ctx.lineWidth});
        }
    }

    function saveCanva() {
        canvaSave.href = canvas.toDataURL("image/png");
        let link = document.createElement("a");
        link.download = "image.png";
        link.href = canvaSave.href;
        link.download = "drawing.png";
        link.click();
    }

    function endCanvas() {
        ctx.closePath();
        drawing = false;
        conn.send({"event": "mouseUpOrLeave"});
    }

    canvas.addEventListener("mousedown", (e) => {
        beginCanvas(e.offsetX, e.offsetY, true, color);
    });

    canvas.addEventListener("mousemove", (e) => {
        moveCanvas(e.offsetX, e.offsetY, true, color);
    });

    canvas.addEventListener("mouseup", (e) => {
        endCanvas();
        drawing = false;
    });

    canvas.addEventListener("mouseleave", (e) => {
        ctx.closePath();
        drawing = false;
    });

    canvasColor.addEventListener("change", (e) => {
        ctx.strokeStyle = canvasColor.value;
    });

    lineWidth.addEventListener("change", (e) => {
        ctx.lineWidth = lineWidth.value;
    });

    canvaSave.addEventListener("click", saveCanva);

    function addMessage(msg) {
      message.innerHTML = "<br>" + msg + message.innerHTML;
    }

    function clearMessages() {
        message.innerHTML = "";
        addMessage("Msgs cleared");
    }

    sendButton.addEventListener('click', function () {
        if (conn && conn.open) {
            let msg = sendMessageBox.value;
            sendMessageBox.value = "";
            conn.send({"event": "message", "message": msg});
            addMessage("<span class=\"selfMsg\">Me: </span>" + msg);
        } else {
            console.log('Connection is closed');
        }
    });

    clearMsgsButton.addEventListener('click', clearMessages);

    initialize();
})();
