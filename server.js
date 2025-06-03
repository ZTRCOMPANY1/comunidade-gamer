const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const socketsAtivos = {};

// ========== ROTAS DE USUÁRIOS ==========
app.post('/api/login', (req, res) => {
    const { nome } = req.body;
    const usuarios = JSON.parse(fs.readFileSync('./data/usuarios.json'));

    let usuario = usuarios.find(u => u.nome === nome);
    if (!usuario) {
        usuario = { id: Date.now(), nome };
        usuarios.push(usuario);
        fs.writeFileSync('./data/usuarios.json', JSON.stringify(usuarios, null, 2));
    }
    res.json({ status: 'sucesso', usuario });
});

// Listar todos os usuários (rota admin)
app.get('/api/usuarios', (req, res) => {
    const usuarios = JSON.parse(fs.readFileSync('./data/usuarios.json'));
    res.json(usuarios);
});


// ========== ROTAS ADMIN ==========
app.post('/api/adminlogin', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === 'admin123') {
        res.json({ status: 'sucesso' });
    } else {
        res.status(401).json({ status: 'erro', mensagem: 'Credenciais inválidas' });
    }
});

app.get('/api/mensagens', (req, res) => {
    const mensagens = JSON.parse(fs.readFileSync('./data/mensagens.json'));
    res.json(mensagens);
});

app.delete('/api/mensagens/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const mensagens = JSON.parse(fs.readFileSync('./data/mensagens.json'));
    const atualizadas = mensagens.filter(m => m.id !== id);
    fs.writeFileSync('./data/mensagens.json', JSON.stringify(atualizadas, null, 2));
    res.json({ status: 'sucesso' });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const motivo = req.query.motivo || 'Conta excluída pelo administrador.';

    const usuarios = JSON.parse(fs.readFileSync('./data/usuarios.json'));
    const atualizados = usuarios.filter(u => u.id !== id);
    fs.writeFileSync('./data/usuarios.json', JSON.stringify(atualizados, null, 2));

    const socketDoUsuario = socketsAtivos[id];
    if (socketDoUsuario) {
        socketDoUsuario.emit('desconectado', motivo);
        socketDoUsuario.disconnect();
        delete socketsAtivos[id];
    }

    res.json({ status: 'sucesso' });
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
    console.log('Socket conectado:', socket.id);

    socket.on('join', (user) => {
        if (!user || !user.id || !user.nome) {
            console.log('Dados de usuário inválidos');
            return;
        }
        socket.username = user.nome;
        socket.userid = user.id;
        socketsAtivos[user.id] = socket;

        console.log(`${socket.username} conectado.`);
        io.emit('chatMessage', `${socket.username} entrou no chat`);
    });

    socket.on('chatMessage', (msg) => {
        if (!socket.username) return;

        const mensagens = JSON.parse(fs.readFileSync('./data/mensagens.json'));
        const novaMsg = {
            id: Date.now(),
            usuario: socket.username,
            userid: socket.userid,
            mensagem: msg,
            data: new Date().toLocaleString()
        };
        mensagens.push(novaMsg);
        fs.writeFileSync('./data/mensagens.json', JSON.stringify(mensagens, null, 2));

        io.emit('chatMessage', `${socket.username}: ${msg}`);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('chatMessage', `${socket.username} saiu do chat`);
        }
        if (socket.userid) {
            delete socketsAtivos[socket.userid];
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
