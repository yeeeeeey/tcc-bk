import { useCallback, useEffect, useRef, useState } from 'react';
import LogisticsHero from './LogisticsHero';
import VantagensSection from './Vantagens';
import ComoFuncionaSection from './ComoFunciona';
import PlanosSection from './Planos';
import FooterSection from './Footer';
import DashboardScreen from './Dashboard';
import LoginScreen from './Login';
import SignupForm from './Cadastro';
import TermosPage from './Termos';
import { EVENTO_SESSAO_EXPIRADA, logout, sessaoAtual } from './api';
import { Redirecionar } from './rotas';
import { navegar, useLocalizacao } from './navegacao';

// A sessão é um cookie HttpOnly validado pelo backend. O front não guarda mais o
// usuário no localStorage: ao abrir o site ele pergunta ao servidor quem está logado.

function telaInicialDe(usuario) {
  const tela = usuario?.preferencias?.tela_inicial;
  return tela && tela !== 'dashboard' ? `/app/${tela}` : '/app';
}

function TelaCarregando() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0A0716', color: '#8981A8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      Carregando...
    </div>
  );
}

function App() {
  const { caminho, query } = useLocalizacao();
  const [usuario, setUsuario] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [aviso, setAviso] = useState('');
  const [emailLogin, setEmailLogin] = useState('');

  useEffect(() => {
    sessaoAtual()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setVerificandoSessao(false));
  }, []);

  const usuarioRef = useRef(null);
  useEffect(() => {
    usuarioRef.current = usuario;
  }, [usuario]);

  // Qualquer 401 da API (sessão expirada, encerrada em outro lugar...) leva ao login
  useEffect(() => {
    function sessaoExpirou() {
      if (!usuarioRef.current) return;
      usuarioRef.current = null;
      setUsuario(null);
      setAviso('Sua sessão expirou ou foi encerrada. Entre novamente.');
      navegar('/login', { substituir: true });
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, sessaoExpirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, sessaoExpirou);
  }, []);

  const entrar = useCallback((usuarioLogado) => {
    setAviso('');
    setUsuario(usuarioLogado);
    // Substitui a entrada do login: "voltar" no painel leva ao início, não ao formulário
    navegar(telaInicialDe(usuarioLogado), { substituir: true });
  }, []);

  const sair = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Mesmo sem resposta do servidor, a tela volta ao início
    }
    setUsuario(null);
    navegar('/', { substituir: true });
  }, []);

  if (verificandoSessao) {
    return <TelaCarregando />;
  }

  if (caminho === '/app' || caminho.startsWith('/app/')) {
    if (!usuario) return <Redirecionar para="/login" />;
    const pagina = caminho.replace(/^\/app\/?/, '').split('/')[0] || 'dashboard';
    return (
      <DashboardScreen
        usuario={usuario}
        pagina={pagina}
        query={query}
        onSair={sair}
        onUsuarioAtualizado={setUsuario}
      />
    );
  }

  if (caminho === '/login') {
    if (usuario) return <Redirecionar para={telaInicialDe(usuario)} />;
    return (
      <LoginScreen
        key={emailLogin}
        emailInicial={emailLogin}
        avisoInicial={aviso}
        onLogin={entrar}
        onGoToSignup={() => navegar('/cadastro')}
        onVoltar={() => navegar('/')}
      />
    );
  }

  if (caminho === '/cadastro') {
    if (usuario) return <Redirecionar para={telaInicialDe(usuario)} />;
    return (
      <SignupForm
        onGoToLogin={(email) => {
          setEmailLogin(email || '');
          navegar('/login');
        }}
        onVoltar={() => navegar('/')}
      />
    );
  }

  if (caminho === '/termos') {
    return <TermosPage />;
  }

  if (caminho !== '/') {
    return <Redirecionar para="/" />;
  }

  return (
    <>
      <LogisticsHero
        onEntrar={() => navegar(usuario ? telaInicialDe(usuario) : '/login')}
        onComecar={() => navegar(usuario ? telaInicialDe(usuario) : '/cadastro')}
      />
      <VantagensSection />
      <ComoFuncionaSection />
      <PlanosSection onEscolherPlano={() => navegar('/cadastro')} />
      <FooterSection />
    </>
  );
}

export default App;
