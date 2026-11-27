import { useState } from "react";
import { UserCheck, UserPlus, UserX } from "lucide-react";
import { atualizarUsuario, criarUsuario } from "../api";
import ListaRecurso from "./ListaRecurso";
import { NOMES_PERFIL } from "./formatacao";
import { MENSAGEM_SENHA, emailValido, senhaValida } from "../validacao";

const FILTROS = [
  ["todos", "Todos", undefined],
  ["pendentes", "Aguardando aprovação", "false"],
  ["ativos", "Ativos", "true"],
];

const COLUNAS = [["id", "#"], ["nome", "Nome"], ["login", "Login"], ["email", "E-mail"], ["ativo", "Situação"]];

function NovoUsuario({ onCriado }) {
  const vazio = { login: "", nome: "", email: "", senha: "", perfil: "operador" };
  const [dados, setDados] = useState(vazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo) => (e) => setDados((d) => ({ ...d, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (dados.login.trim().length < 3 || /\s/.test(dados.login.trim())) return setErro("Login: mínimo de 3 caracteres, sem espaços.");
    if (dados.email && !emailValido(dados.email.trim())) return setErro("E-mail inválido.");
    if (!senhaValida(dados.senha)) return setErro(`Senha: ${MENSAGEM_SENHA}`);

    setSalvando(true);
    try {
      await criarUsuario({
        login: dados.login.trim(),
        senha: dados.senha,
        perfil: dados.perfil,
        ...(dados.nome.trim() && { nome: dados.nome.trim() }),
        ...(dados.email.trim() && { email: dados.email.trim() }),
      });
      setDados(vazio);
      onCriado();
    } catch (erroApi) {
      setErro(erroApi.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="db-panel" onSubmit={enviar} noValidate>
      <div className="db-panel-head">
        <span className="db-panel-title">Novo usuário</span>
      </div>
      <div className="db-form-grid">
        <label>Login<input className="db-input" value={dados.login} onChange={alterar("login")} maxLength={150} autoComplete="off" /></label>
        <label>Nome<input className="db-input" value={dados.nome} onChange={alterar("nome")} maxLength={150} /></label>
        <label>E-mail<input className="db-input" type="email" value={dados.email} onChange={alterar("email")} maxLength={150} /></label>
        <label>Senha inicial<input className="db-input" type="password" value={dados.senha} onChange={alterar("senha")} autoComplete="new-password" /></label>
        <label>Perfil
          <select className="db-input" value={dados.perfil} onChange={alterar("perfil")}>
            {Object.entries(NOMES_PERFIL).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
          </select>
        </label>
      </div>
      {erro && <p className="db-msg erro" style={{ marginTop: 12 }}>{erro}</p>}
      <button className="db-btn" type="submit" disabled={salvando} style={{ marginTop: 14 }}>
        <UserPlus size={15} /> {salvando ? "Criando..." : "Criar usuário"}
      </button>
    </form>
  );
}

// Gestão de acessos (somente administrador): aprova cadastros, troca perfil e desativa contas
export default function GestaoUsuarios({ usuarioLogado, limite, buscaInicial }) {
  const [filtro, setFiltro] = useState("todos");
  const [versao, setVersao] = useState(0);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const ativo = FILTROS.find(([chave]) => chave === filtro)[2];

  async function alterar(usuario, dados, sucesso) {
    setMensagem({ tipo: "", texto: "" });
    try {
      await atualizarUsuario(usuario.id, dados);
      setMensagem({ tipo: "ok", texto: sucesso });
      setVersao((v) => v + 1);
    } catch (erro) {
      setMensagem({ tipo: "erro", texto: erro.message });
    }
  }

  function acoes(usuario) {
    const proprio = usuario.id === usuarioLogado.id;
    return (
      <div className="db-acoes">
        <select
          className="db-input db-input-compacto"
          value={usuario.perfil}
          disabled={proprio}
          title={proprio ? "Você não pode alterar o próprio perfil" : "Perfil de acesso"}
          aria-label={`Perfil de ${usuario.login}`}
          onChange={(e) => alterar(usuario, { perfil: e.target.value }, `Perfil de ${usuario.login} alterado.`)}
        >
          {Object.entries(NOMES_PERFIL).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select>
        {usuario.ativo ? (
          <button
            className="db-btn secundario perigo"
            disabled={proprio}
            onClick={() => alterar(usuario, { ativo: false }, `${usuario.login} desativado.`)}
          >
            <UserX size={14} /> Desativar
          </button>
        ) : (
          <button className="db-btn" onClick={() => alterar(usuario, { ativo: true }, `${usuario.login} aprovado.`)}>
            <UserCheck size={14} /> Aprovar
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="db-toolbar">
        <div className="db-segmentos" role="group" aria-label="Filtrar usuários">
          {FILTROS.map(([chave, rotulo]) => (
            <button key={chave} className={filtro === chave ? "ativo" : ""} onClick={() => setFiltro(chave)}>{rotulo}</button>
          ))}
        </div>
        <button className="db-btn secundario" onClick={() => setMostrarFormulario((v) => !v)}>
          <UserPlus size={15} /> {mostrarFormulario ? "Fechar formulário" : "Novo usuário"}
        </button>
      </div>

      {mostrarFormulario && (
        <NovoUsuario
          onCriado={() => {
            setMensagem({ tipo: "ok", texto: "Usuário criado." });
            setVersao((v) => v + 1);
          }}
        />
      )}

      {mensagem.texto && <p className={`db-msg ${mensagem.tipo === "erro" ? "erro" : "sucesso"}`}>{mensagem.texto}</p>}

      <ListaRecurso
        key={filtro}
        titulo="Usuários"
        recurso="usuarios"
        colunas={COLUNAS}
        limite={limite}
        buscaInicial={buscaInicial}
        filtrosExtras={{ ativo }}
        renderAcoes={acoes}
        versao={versao}
      />
    </>
  );
}
