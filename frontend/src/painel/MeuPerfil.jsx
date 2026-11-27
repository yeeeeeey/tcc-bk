import { useState } from "react";
import { KeyRound, LogOut, Save } from "lucide-react";
import { alterarMinhaSenha, atualizarMeuPerfil, encerrarOutrasSessoes } from "../api";
import { NOMES_PERFIL } from "./formatacao";
import { MENSAGEM_SENHA, cnpjValido, mascararCnpj, senhaValida } from "../validacao";

const TELAS_INICIAIS = [
  ["dashboard", "Dashboard"],
  ["produtos", "Produtos"],
  ["armazens", "Armazém"],
  ["estoque", "Estoque"],
  ["entregas", "Logística"],
  ["rastreamento", "Rastreamento"],
  ["movimentacoes", "Movimentações"],
  ["transportadoras", "Transportadora"],
  ["veiculos", "Veículos"],
  ["alertas", "Alertas"],
];

function Aviso({ estado }) {
  if (!estado.texto) return null;
  return <p className={`db-msg ${estado.tipo === "erro" ? "erro" : "sucesso"}`} role="status">{estado.texto}</p>;
}

// Tela "Meu perfil": disponível para todos os perfis, inclusive operador
export default function MeuPerfil({ usuario, onAtualizado }) {
  const [nome, setNome] = useState(usuario.nome || "");
  const [cnpj, setCnpj] = useState(usuario.cnpj || "");
  const [itensPorPagina, setItensPorPagina] = useState(usuario.preferencias?.itens_por_pagina || 20);
  const [telaInicial, setTelaInicial] = useState(usuario.preferencias?.tela_inicial || "dashboard");
  const [estadoDados, setEstadoDados] = useState({ tipo: "", texto: "" });

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [estadoSenha, setEstadoSenha] = useState({ tipo: "", texto: "" });
  const [estadoSessoes, setEstadoSessoes] = useState({ tipo: "", texto: "" });
  const [ocupado, setOcupado] = useState("");

  async function salvarDados(e) {
    e.preventDefault();
    setEstadoDados({ tipo: "", texto: "" });
    if (!nome.trim()) return setEstadoDados({ tipo: "erro", texto: "Informe seu nome." });
    if (cnpj && !cnpjValido(cnpj)) return setEstadoDados({ tipo: "erro", texto: "CNPJ inválido." });

    setOcupado("dados");
    try {
      const atualizado = await atualizarMeuPerfil({
        nome: nome.trim(),
        cnpj: cnpj ? cnpj : null,
        preferencias: { itens_por_pagina: Number(itensPorPagina), tela_inicial: telaInicial },
      });
      onAtualizado(atualizado);
      setEstadoDados({ tipo: "ok", texto: "Dados e preferências salvos." });
    } catch (erro) {
      setEstadoDados({ tipo: "erro", texto: erro.message });
    } finally {
      setOcupado("");
    }
  }

  async function trocarSenha(e) {
    e.preventDefault();
    setEstadoSenha({ tipo: "", texto: "" });
    if (!senhaAtual) return setEstadoSenha({ tipo: "erro", texto: "Informe a senha atual." });
    if (!senhaValida(novaSenha)) return setEstadoSenha({ tipo: "erro", texto: `Nova senha: ${MENSAGEM_SENHA}` });
    if (novaSenha !== confirmacao) return setEstadoSenha({ tipo: "erro", texto: "A confirmação não confere com a nova senha." });

    setOcupado("senha");
    try {
      const resposta = await alterarMinhaSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      setEstadoSenha({ tipo: "ok", texto: resposta.mensagem });
    } catch (erro) {
      setEstadoSenha({ tipo: "erro", texto: erro.message });
    } finally {
      setOcupado("");
    }
  }

  async function encerrarSessoes() {
    setOcupado("sessoes");
    try {
      const resposta = await encerrarOutrasSessoes();
      setEstadoSessoes({ tipo: "ok", texto: resposta.mensagem });
    } catch (erro) {
      setEstadoSessoes({ tipo: "erro", texto: erro.message });
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="db-row-2">
      <form className="db-panel" onSubmit={salvarDados} noValidate>
        <div className="db-panel-head">
          <span className="db-panel-title">Meus dados e preferências</span>
        </div>
        <div className="db-form-grid">
          <label>Nome<input className="db-input" value={nome} maxLength={150} onChange={(e) => setNome(e.target.value)} /></label>
          <label>Login<input className="db-input" value={usuario.login} disabled /></label>
          <label>E-mail<input className="db-input" value={usuario.email || "—"} disabled /></label>
          <label>Perfil de acesso<input className="db-input" value={NOMES_PERFIL[usuario.perfil] || usuario.perfil} disabled /></label>
          <label>CNPJ (opcional)<input className="db-input" value={cnpj} placeholder="00.000.000/0000-00" onChange={(e) => setCnpj(mascararCnpj(e.target.value))} /></label>
          <label>Itens por página
            <select className="db-input" value={itensPorPagina} onChange={(e) => setItensPorPagina(e.target.value)}>
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>Tela inicial após o login
            <select className="db-input" value={telaInicial} onChange={(e) => setTelaInicial(e.target.value)}>
              {TELAS_INICIAIS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select>
          </label>
        </div>
        <p className="db-dica">Login, e-mail e perfil só podem ser alterados por um administrador.</p>
        <Aviso estado={estadoDados} />
        <button className="db-btn" type="submit" disabled={ocupado === "dados"}>
          <Save size={15} /> {ocupado === "dados" ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <form className="db-panel" onSubmit={trocarSenha} noValidate>
          <div className="db-panel-head">
            <span className="db-panel-title">Alterar senha</span>
          </div>
          <div className="db-form-grid uma-coluna">
            <label>Senha atual<input className="db-input" type="password" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} /></label>
            <label>Nova senha<input className="db-input" type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} /></label>
            <label>Confirmar nova senha<input className="db-input" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} /></label>
          </div>
          <p className="db-dica">{MENSAGEM_SENHA} As outras sessões abertas serão encerradas.</p>
          <Aviso estado={estadoSenha} />
          <button className="db-btn" type="submit" disabled={ocupado === "senha"}>
            <KeyRound size={15} /> {ocupado === "senha" ? "Alterando..." : "Alterar senha"}
          </button>
        </form>

        <div className="db-panel">
          <div className="db-panel-head">
            <span className="db-panel-title">Sessões</span>
          </div>
          <p className="db-dica" style={{ marginTop: 0 }}>Saia de todos os outros navegadores e dispositivos onde sua conta está conectada.</p>
          <Aviso estado={estadoSessoes} />
          <button className="db-btn secundario" onClick={encerrarSessoes} disabled={ocupado === "sessoes"}>
            <LogOut size={15} /> Encerrar outras sessões
          </button>
        </div>
      </div>
    </div>
  );
}
