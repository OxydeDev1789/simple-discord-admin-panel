document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section');
  const menuItems = document.querySelectorAll('.menu-item');
  const popup = document.getElementById('popup');
  const popupContent = document.getElementById('popup-content');
  const dmallStatus = document.getElementById('dmall-status');
  const themeToggle = document.getElementById('theme-toggle');
  
  let currentAction = null;
  let currentServer = null;
  let currentUser = null;
  let currentRole = null;

  let usersData = null;
  let rolesData = null;
  let serversData = null;

  document.getElementById('connect-form').addEventListener('submit', event => {
    event.preventDefault();
    const token = document.getElementById('token').value;
    connectBot(token);
  });

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const section = document.getElementById(item.getAttribute('data-section'));
      sections.forEach(sec => sec.classList.remove('active'));
      section.classList.add('active');
      // Charger les données en fonction de la section
      if (item.getAttribute('data-section') === 'users') {
        if (!usersData) {
          fetchUsers();
        } else {
          displayUsers(usersData);
        }
      } else if (item.getAttribute('data-section') === 'roles') {
        if (!rolesData) {
          fetchRoles();
        } else {
          displayRoles(rolesData);
        }
      } else if (item.getAttribute('data-section') === 'servers') {
        if (!serversData) {
          fetchServers();
        } else {
          displayServers(serversData);
        }
      }
    });
  });

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
  });

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('discordBotToken'); 
    window.location.href = '/'; 
  });

  function connectBot(token) {
    fetch('/api/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Invalid token') {
        alert('Invalid token. Please try again.');
      } else {
        localStorage.setItem('discordBotToken', token);
        alert(`Connecté en tant que ${data.username}#${data.discriminator}`);
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'flex';
        setupWebSocket(token);
        fetchUsers();
        fetchRoles();
        fetchServers();
      }
    })
    .catch(error => console.error('Error connecting bot:', error));
  }

  function setupWebSocket(token) {
    const socket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
    socket.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.type === 'dmall-status') {
        updateDmAllStatus(data.message, data.status);
      }
    });
  }

  function updateDmAllStatus(message, status) {
    const statusLine = document.createElement('div');
    statusLine.classList.add('status-line', status);
    statusLine.textContent = message;
    dmallStatus.appendChild(statusLine);
    dmallStatus.scrollTop = dmallStatus.scrollHeight; // Scroll to the bottom
  }

  function fetchUsers() {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/users', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      usersData = data;
      displayUsers(usersData);
    })
    .catch(error => console.error('Error fetching users:', error));
  }

  function displayUsers(data) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    const servers = {};

    data.forEach(member => {
      const guildId = member.guild_id;
      if (!servers[guildId]) {
        servers[guildId] = {
          name: member.guild_name,
          members: []
        };
      }
      servers[guildId].members.push(member);
    });

    for (const guildId in servers) {
      const server = servers[guildId];
      const serverSection = document.createElement('div');
      serverSection.classList.add('server-section');

      const serverTitle = document.createElement('h3');
      serverTitle.classList.add('server-title');
      serverTitle.textContent = server.name;
      serverTitle.addEventListener('click', () => {
        serverContent.classList.toggle('active');
      });

      const serverContent = document.createElement('div');
      serverContent.classList.add('server-content');

      const searchBar = document.createElement('div');
      searchBar.classList.add('search-bar');
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Rechercher un utilisateurs';
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        serverContent.querySelectorAll('.item-card').forEach(card => {
          const username = card.textContent.toLowerCase();
          if (username.includes(searchTerm)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });

      searchBar.appendChild(searchInput);
      serverContent.appendChild(searchBar);

      server.members.forEach(member => {
        const userDiv = document.createElement('div');
        userDiv.classList.add('item-card');
        userDiv.textContent = `${member.user.username}#${member.user.discriminator}`;

        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');

        const banButton = document.createElement('button');
        banButton.classList.add('ban-button');
        banButton.textContent = 'Ban';
        banButton.addEventListener('click', () => showPopup('ban', member));

        const kickButton = document.createElement('button');
        kickButton.classList.add('kick-button');
        kickButton.textContent = 'Kick';
        kickButton.addEventListener('click', () => showPopup('kick', member));

        const renameButton = document.createElement('button');
        renameButton.classList.add('rename-button');
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', () => showPopup('rename', member));

        actionButtons.appendChild(banButton);
        actionButtons.appendChild(kickButton);
        actionButtons.appendChild(renameButton);

        userDiv.appendChild(actionButtons);
        serverContent.appendChild(userDiv);
      });

      serverSection.appendChild(serverTitle);
      serverSection.appendChild(serverContent);
      usersList.appendChild(serverSection);
    }
  }

  function fetchRoles() {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/roles', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      rolesData = data;
      displayRoles(rolesData);
    })
    .catch(error => console.error('Error fetching roles:', error));
  }

  function displayRoles(data) {
    const rolesList = document.getElementById('roles-list');
    rolesList.innerHTML = '';
    const servers = {};

    data.forEach(role => {
      const guildId = role.guild_id;
      if (!servers[guildId]) {
        servers[guildId] = {
          name: role.guild_name,
          roles: []
        };
      }
      servers[guildId].roles.push(role);
    });

    for (const guildId in servers) {
      const server = servers[guildId];
      const serverSection = document.createElement('div');
      serverSection.classList.add('server-section');

      const serverTitle = document.createElement('h3');
      serverTitle.classList.add('server-title');
      serverTitle.textContent = server.name;
      serverTitle.addEventListener('click', () => {
        serverContent.classList.toggle('active');
      });

      const serverContent = document.createElement('div');
      serverContent.classList.add('server-content');

      const searchBar = document.createElement('div');
      searchBar.classList.add('search-bar');
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Rechercher un rôle';
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        serverContent.querySelectorAll('.item-card').forEach(card => {
          const roleName = card.textContent.toLowerCase();
          if (roleName.includes(searchTerm)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });

      searchBar.appendChild(searchInput);
      serverContent.appendChild(searchBar);

      server.roles.forEach(role => {
        const roleDiv = document.createElement('div');
        roleDiv.classList.add('item-card');
        roleDiv.textContent = role.name;

        const actionButtons = document.createElement('div');
        actionButtons.classList.add('action-buttons');

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => showPopup('deleteRole', role));

        const renameButton = document.createElement('button');
        renameButton.classList.add('rename-button');
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', () => showPopup('renameRole', role));

        actionButtons.appendChild(deleteButton);
        actionButtons.appendChild(renameButton);

        roleDiv.appendChild(actionButtons);
        serverContent.appendChild(roleDiv);
      });

      serverSection.appendChild(serverTitle);
      serverSection.appendChild(serverContent);
      rolesList.appendChild(serverSection);
    }
  }

  function fetchServers() {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/servers', {
      headers: {
        Authorization: `Bot ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      serversData = data;
      displayServers(serversData);
    })
    .catch(error => console.error('Error fetching servers:', error));
  }

  function displayServers(data) {
    const serversList = document.getElementById('servers-list');
    serversList.innerHTML = '';
    data.forEach(server => {
      const serverDiv = document.createElement('div');
      serverDiv.classList.add('item-card');
      serverDiv.textContent = server.name;

      const actionButtons = document.createElement('div');
      actionButtons.classList.add('action-buttons');

      const leaveButton = document.createElement('button');
      leaveButton.classList.add('leave-button');
      leaveButton.textContent = 'Quitter';
      leaveButton.addEventListener('click', () => showPopup('leave', server));

      const dmallButton = document.createElement('button');
      dmallButton.classList.add('dmall-button');
      dmallButton.textContent = 'DmAll';
      dmallButton.addEventListener('click', () => showPopup('dmall', server));

      actionButtons.appendChild(leaveButton);
      actionButtons.appendChild(dmallButton);
      serverDiv.appendChild(actionButtons);
      serversList.appendChild(serverDiv);
    });
  }

  function showPopup(action, item) {
    currentAction = action;
    currentUser = action === 'rename' || action === 'ban' || action === 'kick' ? item : null;
    currentServer = action === 'leave' || action === 'dmall' ? item : null;
    currentRole = action === 'deleteRole' || action === 'renameRole' ? item : null;

    popupContent.innerHTML = '';
    const popupTitle = document.createElement('h3');
    popupContent.appendChild(popupTitle);

    if (action === 'rename') {
      popupTitle.textContent = `Renommer ${item.user.username}#${item.user.discriminator}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'new-name';
      input.placeholder = 'Nouveau nom';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Confirmer';
      const resetButton = document.createElement('button');
      resetButton.id = 'reset';
      resetButton.classList.add('reset');
      resetButton.textContent = 'Réinitialiser le pseudo';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => renameUser(currentUser, document.getElementById('new-name').value));
      resetButton.addEventListener('click', () => resetUserName(currentUser));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(input);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(resetButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'leave') {
      popupTitle.textContent = `Voulez-vous vraiment quitter le serveur ${item.name} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', confirmAction);
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'dmall') {
      popupTitle.textContent = `Envoyer un message à tous les membres du serveur ${item.name}`;
      const textarea = document.createElement('textarea');
      textarea.id = 'dm-message';
      textarea.placeholder = 'Votre message';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Envoyer';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => sendDmToAll(item, document.getElementById('dm-message').value));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(textarea);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'ban' || action === 'kick') {
      const actionText = action === 'ban' ? 'ban' : 'kick';
      popupTitle.textContent = `Voulez-vous vraiment ${actionText} ${item.user.username}#${item.user.discriminator} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', confirmAction);
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'deleteRole') {
      popupTitle.textContent = `Voulez-vous vraiment supprimer le rôle ${item.name} ?`;
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Oui';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Non';

      confirmButton.addEventListener('click', () => deleteRole(currentRole));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    } else if (action === 'renameRole') {
      popupTitle.textContent = `Renommer le rôle ${item.name}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'new-role-name';
      input.placeholder = 'Nouveau nom du rôle';
      const confirmButton = document.createElement('button');
      confirmButton.id = 'confirm';
      confirmButton.classList.add('confirm');
      confirmButton.textContent = 'Confirmer';
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel';
      cancelButton.classList.add('cancel');
      cancelButton.textContent = 'Annuler';

      confirmButton.addEventListener('click', () => renameRole(currentRole, document.getElementById('new-role-name').value));
      cancelButton.addEventListener('click', closePopup);

      popupContent.appendChild(input);
      popupContent.appendChild(confirmButton);
      popupContent.appendChild(cancelButton);
    }

    popup.classList.add('active');
  }

  function confirmAction() {
    if (currentAction && (currentUser || currentServer)) {
      const token = localStorage.getItem('discordBotToken');
      const actionEndpoint = currentAction === 'ban' ? '/api/ban' : currentAction === 'kick' ? '/api/kick' : currentAction === 'leave' ? '/api/leave' : null;
      const actionText = currentAction === 'ban' ? 'banned' : currentAction === 'kick' ? 'kicked' : 'left';

      fetch(actionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          guildId: currentUser ? currentUser.guild_id : currentServer.id,
          userId: currentUser ? currentUser.user.id : null
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.message.includes('Succès')) {
          alert(`User ${currentUser.user.username}#${currentUser.user.discriminator} a bien été ${actionText}!`);
          if (currentAction === 'Quitter') fetchServers();
        } else {
          alert(`Echec de ${currentAction} utilisateur ${currentUser.user.username}#${currentUser.user.discriminator}.`);
        }
      })
      .catch(error => console.error(`Erreur ${currentAction}ing utilisateur:`, error));
    }
    closePopup();
  }

  function renameUser(user, newName) {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: user.guild_id,
        userId: user.user.id,
        newName: newName
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Utilisateur renommé avec succès') {
        alert(`User ${user.user.username}#${user.user.discriminator} a bien été renommer en ${newName}!`);
      } else {
        alert(`Echec pour renommer l'utilisateur ${user.user.username}#${user.user.discriminator}.`);
      }
    })
    .catch(error => console.error('Erreur pour renommer :', error));
    closePopup();
  }

  function resetUserName(user) {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: user.guild_id,
        userId: user.user.id,
        newName: ''
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'User renamed successfully') {
        alert(`User ${user.user.username}#${user.user.discriminator}'s surnom a bien été réinitialisé !`);
      } else {
        alert(`Echec pour la réinitialisation du pseudo de ${user.user.username}#${user.user.discriminator}.`);
      }
    })
    .catch(error => console.error('Echec de réinitialisation du pseudo :', error));
    closePopup();
  }

  function sendDmToAll(server, message) {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/dmall', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: server.id,
        message: message
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Messages Envoyés') {
        alert(`Message envoyé à tout les membres de ${server.name}`);
        dmallStatus.innerHTML = '<h3>DMALL en cours...</h3>';
      } else {
        alert(`Echec de l'envoie a tout les membres de ${server.name}`);
      }
    })
    .catch(error => console.error('Erreur envoie de messages:', error));
    closePopup();
  }

  function deleteRole(role) {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/role/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: role.guild_id,
        roleId: role.id
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Role supprimer avec succès ') {
        alert(`Role ${role.name} a bien été supprimé !`);
        fetchRoles();
      } else {
        alert(`Echec pour supprimer le role de ${role.name}.`);
      }
    })
    .catch(error => console.error('Echec suppression de role :', error));
    closePopup();
  }

  function renameRole(role, newName) {
    const token = localStorage.getItem('discordBotToken');
    fetch('/api/role/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        guildId: role.guild_id,
        roleId: role.id,
        newName: newName
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Role renommé avec succès ') {
        alert(`Role ${role.name} A bien été renomé en ${newName}!`);
        fetchRoles();
      } else {
        alert(`Echec pour renommer le role ${role.name}.`);
      }
    })
    .catch(error => console.error('Echec pour renommer le role:', error));
    closePopup();
  }

  function closePopup() {
    popup.classList.remove('active');
  }
});
