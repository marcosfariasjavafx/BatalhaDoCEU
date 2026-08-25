export function Footer() {
  return (
    <footer>
      <div>
        <div className="ft-logo" style={{ marginBottom: '.5rem' }}>
          <img src="/assets/logo-branco.png" alt="Batalha do Céu" style={{ height: 48, width: 'auto' }} />
        </div>
        <div className="ft-copy">Santa Bárbara d'Oeste · SP · Brasil<br />Movimento Hip-Hop Underground</div>
      </div>
      <div className="ft-copy" style={{ textAlign: 'right' }}>
        Projeto de Extensão · IFSP<br />
        © {new Date().getFullYear()} · Sem fins lucrativos
      </div>
    </footer>
  )
}
