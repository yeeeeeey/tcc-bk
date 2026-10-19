import { useState } from 'react';
import LogisticsHero from './LogisticsHero';
import VantagensSection from './Vantagens';
import ComoFuncionaSection from './ComoFunciona';
import PlanosSection from './Planos';
import FooterSection from './Footer';
import DashboardScreen from './Dashboard';
import LoginScreen from './Login';
import SignupForm from './Cadastro';

const CHAVE_SESSAO = 'bankai:usuario';

// Mantém o usuário logado ao recarregar a página
function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
  } catch {
    return null;
  }
}

function salvarSessao(usuario) {
  try {
    if (usuario) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem localStorage (aba anônima bloqueada etc.): a sessão vale só até recarregar
  }
}

function App() {
  const [usuario, setUsuario] = useState(lerSessao);
  // "inicio" | "login" | "cadastro" (o dashboard aparece sempre que há usuário logado)
  const [tela, setTela] = useState('inicio');
  const [emailLogin, setEmailLogin] = useState('');

  function irPara(novaTela) {
    setTela(novaTela);
    window.scrollTo(0, 0);
  }

  function entrar(usuarioLogado) {
    salvarSessao(usuarioLogado);
    setUsuario(usuarioLogado);
  }

  function sair() {
    salvarSessao(null);
    setUsuario(null);
    irPara('inicio');
  }

  if (usuario) {
    return <DashboardScreen usuario={usuario} onSair={sair} />;
  }

  if (tela === 'login') {
    return (
      <LoginScreen
        key={emailLogin}
        emailInicial={emailLogin}
        onLogin={entrar}
        onGoToSignup={() => irPara('cadastro')}
        onVoltar={() => irPara('inicio')}
      />
    );
  }

  if (tela === 'cadastro') {
    return (
      <SignupForm
        onGoToLogin={(email) => {
          setEmailLogin(email || '');
          irPara('login');
        }}
        onVoltar={() => irPara('inicio')}
      />
    );
  }

  return (
    <>
      <LogisticsHero onEntrar={() => irPara('login')} onComecar={() => irPara('cadastro')} />
      <VantagensSection />
      <ComoFuncionaSection />
      <PlanosSection onEscolherPlano={() => irPara('cadastro')} />
      <FooterSection />
    </>
  );
}

export default App;
