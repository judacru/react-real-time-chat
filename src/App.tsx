import React from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import Chat from './components/Chat';
import UserForm from './components/UserForm';
import { Interaction, User, PublicKeyInteraction, Dict, MessageInteraction } from './interfaces';
import { servicesConfig } from './utils/config';
import { getPic } from './utils/img';


function App() {
  
  const [connection, setConnection] = React.useState<HubConnection>();
  const [users, setUsers] = React.useState<Dict<User>>({});
  const [user, setUser] = React.useState("");
  const [publicKey, setPublickey] = React.useState("");
  const [privateKey, setPrivateKey] = React.useState<CryptoKey>();

  React.useEffect(() => {
    (async () => {
      try {
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: { name: 'SHA-256' }
          },
          true,
          ['encrypt', 'decrypt']
        );
        const publicKeyData = JSON.stringify(
          await window.crypto.subtle.exportKey('jwk', key.publicKey)
        );
        setPublickey(publicKeyData);
        setPrivateKey(key.privateKey);
      } catch (error) {
        console.error(error);
      }
    })();

    const newConnection = new HubConnectionBuilder().withUrl(servicesConfig.chatHub).withAutomaticReconnect().build();
    setConnection(newConnection)
  }, []);



  const onListUsers = React.useCallback((userNames: Array<string>) => {
    console.log(userNames)
    const newUsers = userNames.reduce((response, name) => ({
      ...response,
      [name]: {
        name,
        picture: getPic(name),
        messages: users[name]?.messages || []
      }
    }), {} as Dict<User>);
    setUsers(newUsers);
  }, [users, setUsers]);

  const onRequestedPublicKey = React.useCallback(async (interaction: Interaction) => {
    await connection?.send('SendPublicKey', interaction.fromUser, publicKey)
  }, [publicKey, connection]);

  const onReceivedPublicKey = React.useCallback(async (publicKeyInteraction: PublicKeyInteraction) => {
    try {
      const publicKeyData = JSON.parse(publicKeyInteraction.publicKey) as JsonWebKey;
      const importedKey = await window.crypto.subtle.importKey('jwk', publicKeyData, {
        name: 'RSA-OAEP',
        hash: { name: 'SHA-256' }
      }, false, ['encrypt']);
      const newUsers = {
        ...users,
        [publicKeyInteraction.fromUser]: {
          ...users[publicKeyInteraction.fromUser],
          publicKey: importedKey
        }
      };
      setUsers(newUsers);
    } catch (error) {
      console.error(error);
    }
  }, [users, setUsers]);

  const onReceivedMessage = React.useCallback(async (messageInteraction: MessageInteraction) => {
    if (!privateKey) {
      return;
    }
    try {
      const message = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        Uint8Array.from(messageInteraction.message)
      );
      const text = new TextDecoder().decode(message);
      const newUsers = {
        ...users,
        [messageInteraction.fromUser]: {
          ...(users[messageInteraction.fromUser] || { messages: [] }),
          messages: [...users[messageInteraction.fromUser].messages,
          {
            date: new Date(),
            reply: false,
            text
          }
          ]
        }
      };
      setUsers(newUsers);
    } catch (error) {
      console.error(error);
    }
  }, [users, privateKey, setUsers]);

  React.useEffect(() => {
    if (connection && user) {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.on('ListUsers', onListUsers);
        connection.on('RequestedPublicKey', onRequestedPublicKey);
        connection.on('ReceivedPublicKey', onReceivedPublicKey);
        connection.on('ReceivedMessage', onReceivedMessage);
      } else {
        connection.start().then(() => {
          connection.on('ListUsers', onListUsers);
          connection.on('RequestedPublicKey', onRequestedPublicKey);
          connection.on('ReceivedPublicKey', onReceivedPublicKey);
          connection.on('ReceivedMessage', onReceivedMessage);
          connection.send('Init', user);
        }).catch((error) => console.error(error));

      }
      return () => {
        connection.off('ListUsers');
        connection.off('RequestedPublicKey');
        connection.off('ReceivedPublicKey');
        connection.off('ReceivedMessage');
      }
    }
  }, [connection, user, onListUsers, onRequestedPublicKey, onReceivedPublicKey, onReceivedPublicKey, onReceivedMessage ])

  const isNavigationActive = ({ isActive }: { isActive: boolean }) => `app-navigation-item ${isActive ? 'selected' : ''}`;

  const onSetUserHandler = async (userName: string) => setUser(userName);
  const sendMessageHandler = React.useCallback(async (toUser: string, message: string) => {
    if (connection?.state !== HubConnectionState.Connected) {
      return
    }
    try {
      if (!users[toUser].publicKey) {
        return;
      }
      const data = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        users[toUser].publicKey!,
        new TextEncoder().encode(message)
      );
      await connection.send('SendMessage', toUser, Array.from(new Uint8Array(data)));
      const newUsers = {
        ...users,
        [toUser]: {
          ...(users[toUser] || { messages: [] }),
          messages: [...users[toUser].messages,
          {
            date: new Date(),
            reply: true,
            text: message
          }
          ]
        }
      };
      setUsers(newUsers);
    } catch (error) {
      console.error(error);
    }
  }, [connection, users, setUsers]);

  const startConversationHandler = React.useCallback(async (toUser: string) => {
    if (connection?.state !== HubConnectionState.Connected) {
      return
    }
    try {
      await connection.send('StartConversation', toUser);
    } catch (error) {
      console.error(error);
    }
  }, [connection])

  return (
    <div className="app">
      <header>
        <h2>Bienvenido {user ? user : ''} al chat</h2>
      </header>
      <main className='app-name'>
        <Routes>
          <Route path='/' element={<UserForm onSetUser={onSetUserHandler} />} />
          <Route path='/chat' element={
            <React.Fragment>
              {!user && <Navigate to='/' />}
              <div className="app-navigation-items">
                {Object.keys(users).filter((u) => u !== user).map((name) =>
                  <NavLink key={name} className={isNavigationActive} to={`/chat/${name}`}>
                    <img src={users[name].picture} alt="Profile Pic" /> {name}

                  </NavLink>)}
              </div>
              <div className="app-navigation-content">
                <Outlet />
              </div>
            </React.Fragment>}>
            <Route path='/chat/:user' element={
              <Chat users={users}
                sendMessageHandler={sendMessageHandler}
                startConversationHandler={startConversationHandler} />
            } />
          </Route>
        </Routes>
      </main>
      <footer></footer>
    </div>
  );
}

export default App;
