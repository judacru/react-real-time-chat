import React from "react";
import { useNavigate } from "react-router-dom";

type UserFormProps = {
    onSetUser: (user: string) => Promise<void>;
};

export default function UserForm({ onSetUser }: UserFormProps) {
    const navigate = useNavigate();
    const [user, setUser] = React.useState('');
    const onNextClick = () => {
        if (user.length > 0) {
            onSetUser(user);
            navigate('/chat');
        }
    }

    return (<div className="user-form">
        <label htmlFor="name">Ingresa tu nombre</label>
        <input type="text" id="name" value={user} onChange={(e) => setUser(e.target.value)} />
        <button onClick={() => onNextClick()}>Continuar</button>
    </div>)

}