import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/bills', { replace: true });
  }, [navigate]);

  return <div>Loading...</div>;
}
