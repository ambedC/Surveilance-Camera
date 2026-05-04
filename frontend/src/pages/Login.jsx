import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInCard } from "@/components/ui/sign-in-card-2";
import { toast } from 'sonner';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const raw = phoneNumber.trim();
    const phonePattern = /^(?:\+91)?\d{10}$/;
    if (!phonePattern.test(raw)) {
      toast.error("Invalid Input", {
        description: "Phone number must be exactly 10 digits.",
      });
      setLoading(false);
      return;
    }

    if (!password) {
      toast.error("Invalid Input", {
        description: "Please enter your password.",
      });
      setLoading(false);
      return;
    }

    try {
      let sendNumber = raw;
      if (sendNumber.startsWith('+91')) {
        sendNumber = sendNumber.slice(3);
      }
      sendNumber = `+91${sendNumber}`;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: sendNumber, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error("Login Failed", {
          description: data.detail || 'The credentials provided are incorrect.',
        });
        return;
      }

      localStorage.setItem('authenticated', 'true');
      localStorage.setItem('userPhone', data.phone_number);
      navigate('/');
    } catch (err) {
      toast.error("Connection Error", {
        description: "Could not reach the authentication server.",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInCard 
      phoneNumber={phoneNumber}
      setPhoneNumber={setPhoneNumber}
      password={password}
      setPassword={setPassword}
      handleLogin={handleLogin}
      loading={loading}
      error={""}
    />
  );
}
