import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, getDoc, setDoc, arrayUnion, onSnapshot, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA_YbgsZqbJRxd7m3cbeJZzmKywctrGLps",
    authDomain: "ahf-banco-de-dados.firebaseapp.com",
    projectId: "ahf-banco-de-dados",
    storageBucket: "ahf-banco-de-dados.appspot.com",
    messagingSenderId: "826655126765",
    appId: "1:826655126765:web:ccf2027c0ee9645d31c3ad"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para garantir que o documento do usuário exista
async function ensureUserDocument(userID) {
    const userRef = doc(db, 'users', userID);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
        await setDoc(userRef, { joinedRooms: [] });
    }
}

// Função para mostrar mensagens de feedback
function showFeedback(message) {
    const modal = document.getElementById('feedback-modal');
    const span = document.getElementsByClassName('close')[0];
    document.getElementById('feedback-message').textContent = message;
    modal.style.display = 'block';
    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Função para mostrar o indicador de carregamento
function showLoading() {
    document.getElementById('loading-indicator').style.display = 'block';
}

// Função para esconder o indicador de carregamento
function hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
}

// Função para criar uma sala
async function createRoom(roomName, userID) {
    const roomID = Math.random().toString(36).substr(2, 6).toUpperCase(); // Gera um código único

    if (roomName.length < 3) {
        showFeedback('O nome da sala deve ter pelo menos 3 caracteres.');
        return;
    }

    showLoading();

    await ensureUserDocument(userID);

    try {
        await setDoc(doc(db, 'rooms', roomID), { name: roomName, creator: userID });
        await updateDoc(doc(db, 'users', userID), { joinedRooms: arrayUnion(roomID) });
        showFeedback('Sala criada com sucesso!');
        loadRooms();
    } catch (error) {
        showFeedback('Erro ao criar a sala. Tente novamente.');
        console.error('Erro ao criar a sala:', error);
    } finally {
        hideLoading();
    }
}

// Função para criar um canal
document.getElementById('create-channel-form').onsubmit = async (event) => {
    event.preventDefault();
    const channelName = document.getElementById('channel-name').value;
    const roomID = localStorage.getItem('currentRoomID');

    if (channelName.length < 3) {
        showFeedback('O nome do canal deve ter pelo menos 3 caracteres.');
        return;
    }

    showLoading();

    try {
        const channelID = Math.random().toString(36).substr(2, 6).toUpperCase(); // Gera um código único
        await setDoc(doc(db, 'rooms', roomID, 'channels', channelID), { name: channelName });
        showFeedback('Canal criado com sucesso!');
        loadChannels(roomID); // Recarrega a lista de canais
    } catch (error) {
        showFeedback('Erro ao criar o canal. Tente novamente.');
        console.error('Erro ao criar o canal:', error);
    } finally {
        hideLoading();
    }
};

// Função para carregar canais
async function loadChannels(roomID) {
    const q = query(collection(db, 'rooms', roomID, 'channels'));
    const channelsListDiv = document.getElementById('channels-list');
    channelsListDiv.innerHTML = '';

    onSnapshot(q, snapshot => {
        snapshot.forEach(doc => {
            const channel = doc.data();
            const channelDiv = document.createElement('div');
            channelDiv.classList.add('channel-item');
            channelDiv.textContent = channel.name;
            channelDiv.onclick = () => openChannel(doc.id);
            channelsListDiv.appendChild(channelDiv);
        });
    });
}

// Função para abrir um canal
function openChannel(channelID) {
    const roomID = localStorage.getItem('currentRoomID');
    localStorage.setItem('currentChannelID', channelID);
    loadMessages(roomID, channelID); // Carrega mensagens do canal selecionado
}

// Função para carregar mensagens de um canal
function loadMessages(roomID, channelID) {
    const q = query(collection(db, 'rooms', roomID, 'channels', channelID, 'messages'), orderBy('timestamp'));
    onSnapshot(q, snapshot => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        snapshot.forEach(doc => {
            const message = document.createElement('div');
            message.classList.add('message');
            message.textContent = doc.data().text;
            messagesDiv.appendChild(message);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}



// Enviar mensagem para o canal
document.getElementById('message-form').onsubmit = async (event) => {
    event.preventDefault();
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value;
    const roomID = localStorage.getItem('currentRoomID');
    const channelID = localStorage.getItem('currentChannelID');
    const user = JSON.parse(localStorage.getItem('user'));
    const userID = user.userID;
    const userName = user.nome; // Supondo que o nome do usuário esteja armazenado como 'nome' no objeto 'user'

    if (messageText.trim() === '') {
        return;
    }

    // Inclui o nome do usuário antes da mensagem
    const mensagemFinal = `${userName}: ${messageText}`;

    showLoading();

    try {
        await addDoc(collection(db, 'rooms', roomID, 'channels', channelID, 'messages'), {
            text: mensagemFinal,
            userID: userID,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (error) {
        showFeedback('Erro ao enviar a mensagem. Tente novamente.');
        console.error('Erro ao enviar a mensagem:', error);
    } finally {
        hideLoading();
    }
};



async function loadRooms() {
    const userID = JSON.parse(localStorage.getItem('user')).userID;
    await ensureUserDocument(userID);

    showLoading();

    try {
        const userRef = doc(db, 'users', userID);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const joinedRooms = userDoc.data().joinedRooms || [];
            const roomsListDiv = document.getElementById('rooms-list');
            roomsListDiv.innerHTML = ''; // Limpa a lista antes de atualizar

            if (joinedRooms.length === 0) {
                roomsListDiv.innerHTML = '<p>Nenhuma sala encontrada.</p>';
            } else {
                for (const roomID of joinedRooms) {
                    const roomRef = doc(db, 'rooms', roomID);
                    const roomDoc = await getDoc(roomRef);
                    if (roomDoc.exists()) {
                        const data = roomDoc.data();
                        const roomDiv = document.createElement('div');
                        roomDiv.classList.add('room-item');
                        roomDiv.textContent = data.name;
                        roomDiv.onclick = () => openRoom(roomID, roomDiv);
                        roomsListDiv.appendChild(roomDiv);
                    }
                }
            }
        }
    } catch (error) {
        showFeedback('Erro ao carregar as salas. Tente novamente.');
        console.error('Erro ao carregar as salas:', error);
    } finally {
        hideLoading();
    }
}

function openRoom(roomID, clickedElement) {
    // Remove a classe 'selected' de todos os itens
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Adiciona a classe 'selected' ao item clicado
    clickedElement.classList.add('selected');

    localStorage.setItem('currentRoomID', roomID);
    loadChannels(roomID); // Carrega canais ao abrir a sala
    updateRoomInfo(roomID); // Atualiza as informações da sala
}

window.onload = () => {
    const currentRoomID = localStorage.getItem('currentRoomID');
    if (currentRoomID) {
        updateRoomInfo(currentRoomID);
        loadChannels(currentRoomID);
    }
};

async function updateRoomInfo(roomID) {
    const roomRef = doc(db, 'rooms', roomID);
    try {
        const roomDoc = await getDoc(roomRef);

        if (roomDoc.exists()) {
            const roomData = roomDoc.data();
            console.log('Room Data:', roomData); // Verifique os dados recebidos
            
            // Atualize o conteúdo dos elementos HTML com os dados da sala
            document.getElementById('room-name').textContent = `Nome da Sala: ${roomData.name}`;
            document.getElementById('room-id').textContent = `ID da Sala: ${roomID}`;
        } else {
            console.log('Room does not exist.');
            document.getElementById('room-name').textContent = 'Sala não encontrada';
            document.getElementById('room-id').textContent = `ID: ${roomID}`;
        }
    } catch (error) {
        console.error('Erro ao atualizar as informações da sala:', error);
        document.getElementById('room-name').textContent = 'Erro ao carregar o nome da sala';
        document.getElementById('room-id').textContent = `ID: ${roomID}`;
    }
}

// Função para entrar em uma sala
async function joinRoom(roomCode, userID) {
    showLoading();

    try {
        const roomRef = doc(db, 'rooms', roomCode);
        const roomDoc = await getDoc(roomRef);

        if (roomDoc.exists()) {
            await ensureUserDocument(userID);
            await updateDoc(doc(db, 'users', userID), { joinedRooms: arrayUnion(roomCode) });
            showFeedback('Você entrou na sala com sucesso!');
            loadRooms(); // Recarrega a lista de salas
        } else {
            showFeedback('Sala não encontrada. Verifique o código e tente novamente.');
        }
    } catch (error) {
        showFeedback('Erro ao entrar na sala. Tente novamente.');
        console.error('Erro ao entrar na sala:', error);
    } finally {
        hideLoading();
    }
}

// Função para mostrar o modal
function showModal() {
    document.getElementById('room-modal').style.display = 'block';
}

// Função para esconder o modal
function hideModal() {
    document.getElementById('room-modal').style.display = 'none';
}

// Lida com o clique no botão "+" para abrir o modal
document.getElementById('add-room-btn').addEventListener('click', showModal);

// Lida com o clique no botão de fechar do modal
document.querySelectorAll('.modal .close').forEach(span => {
    span.onclick = hideModal;
});

// Fecha o modal se o usuário clicar fora dele
window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        hideModal();
    }
};

// Lida com o envio do formulário para criar sala no modal
document.getElementById('create-room-form-modal').addEventListener('submit', (event) => {
    event.preventDefault();
    const roomName = document.getElementById('room-name-modal').value.trim();
    const userID = JSON.parse(localStorage.getItem('user')).userID;
    createRoom(roomName, userID);
    hideModal(); // Fecha o modal após a criação da sala
});

// Lida com o envio do formulário para entrar na sala no modal
document.getElementById('join-room-form-modal').addEventListener('submit', (event) => {
    event.preventDefault();
    const roomCode = document.getElementById('room-code-modal').value.trim();
    const userID = JSON.parse(localStorage.getItem('user')).userID;
    joinRoom(roomCode, userID);
    hideModal(); // Fecha o modal após a entrada na sala
});



// Seleciona o botão de logout
const logoutBtn = document.getElementById('logout-btn');

// Adiciona um manipulador de eventos para o botão de logout
logoutBtn.addEventListener('click', () => {
    try {
        // Limpar o localStorage
        localStorage.clear();
        
        // Redireciona para a página inicial
        window.location.href = 'index.html'; // Altere para o caminho da sua página de login
    } catch (error) {
        console.error('Erro ao sair da conta:', error);
    }
});





function generateTemporaryData() {
    // Recupera o nome armazenado no localStorage
    const displayName = localStorage.getItem('displayName') || 'Usuário';

    // Gera um ID aleatório
    function generateRandomID(length) {
        return Math.random().toString(36).substr(2, length).toUpperCase();
    }

    // Gera um e-mail temporário
    function generateEmail(displayName) {
        const id = generateRandomID(8);
        return `${displayName.replace(/\s+/g, '.').toLowerCase()}.${id}@temporarymail.com`;
    }

    // Gera um número de telefone fictício
    function generatePhoneNumber() {
        const areaCode = Math.floor(Math.random() * 900) + 100;
        const number = Math.floor(Math.random() * 9000000000) + 1000000000;
        return `+55 ${areaCode} ${number}`;
    }

    // Gera um endereço temporário
    function generateAddress() {
        const streetNumber = Math.floor(Math.random() * 1000) + 1;
        const streetName = `Rua Temporária ${generateRandomID(5)}`;
        const city = `Cidade ${generateRandomID(4)}`;
        const state = `Estado ${generateRandomID(2)}`;
        const zipCode = `${Math.floor(Math.random() * 90000) + 10000}`;
        return `${streetName}, nº ${streetNumber}, Bairro Fictício, ${city}, ${state}, CEP ${zipCode}`;
    }

    return {
        name: displayName,
        email: generateEmail(displayName),
        phone: generatePhoneNumber(),
        address: generateAddress()
    };
}

// Exemplo de uso
const temporaryData = generateTemporaryData();
console.log(temporaryData);



// Carregar salas ao carregar a página
loadRooms();
