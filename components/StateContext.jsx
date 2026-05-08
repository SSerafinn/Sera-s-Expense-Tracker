"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const StateContext = createContext();

export function StateProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [state, setState] = useState({
    transactions: [],
    accounts: [],
    incomes: [],
    recurringExpenses: [],
    auditLogs: [],
    categories: [],
    goals: []
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      // eslint-disable-next-line
      setToken(savedToken);
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        setUser(payload);
      } catch (e) { }
    }
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const authFetch = async (url, options = {}) => {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  const fetchState = async () => {
    try {
      const res = await authFetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      setState(data);
    } catch (e) {
      console.error("Failed to fetch state", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    if (token) fetchState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);



  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      setUser(payload);
      return true;
    }
    return false;
  };

  const register = async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.ok;
  };



  const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 4000,
    customClass: { popup: 'custom-swal-popup', title: 'custom-swal-title', icon: 'custom-swal-icon' }
  });

  return (
    <StateContext.Provider value={{ token, user, state, fetchState, authFetch, login, register, logout, Toast }}>
      {children}
    </StateContext.Provider>
  );
}

export function useStateContext() {
  return useContext(StateContext);
}
