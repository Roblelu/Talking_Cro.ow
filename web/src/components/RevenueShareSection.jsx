import React from 'react';
import './RevenueShareSection.css';

/**
 * Sección informativa sobre el programa de recompensas y niveles de creador.
 * ¿POR QUÉ EXISTE?
 * - Comunica las métricas que el creador debe cumplir para subir de rango.
 * - Es puramente informativo (UI estática), no contiene lógica de negocio o transacciones.
 * @returns {JSX.Element}
 */
const RevenueShareSection = () => {
  return (
    <div className="revenue-share-container" id="revenue-share">
      <div className="revenue-share-content">
        <h2 className="revenue-title">Programa de Recompensas para Creadores</h2>
        <p className="revenue-subtitle">
          Desbloquea mayores ganancias mediante las interacciones de tu comunidad y tu actividad con la plataforma.
        </p>

        <div className="table-responsive">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>Rango del Creador</th>
                <th>Tu Ganancia en Croins</th>
                <th>Equivalencia en MXN</th>
                <th>Requisitos para Mantener tu Rango</th>
                <th>Requisitos para Subir de Rango</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rank-cell">🥉 Nivel 1: Creator</td>
                <td>15% de las Croins que manden en tu Stream</td>
                <td className="highlight-cell">~$0.25 MXN x mensaje Eco</td>
                <td>Sin requisitos. ¡Empieza a crecer a tu ritmo!</td>
                <td>
                  <ul>
                    <li>🎙️ 500 audios Eco</li>
                    <li>📅 8 Días de transmisión activa</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="rank-cell">🥈 Nivel 2: Growth</td>
                <td>20% de las Croins que manden en tu Stream</td>
                <td className="highlight-cell">~$0.34 MXN x mensaje Eco</td>
                <td>
                  <ul>
                    <li>🎙️ 500 audios Eco</li>
                    <li>📅 8 Días de transmisión activa</li>
                  </ul>
                </td>
                <td>
                  <ul>
                    <li>🎙️ 1000 audios Eco</li>
                    <li>📅 16 Días de transmisión activa</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="rank-cell">🥇 Nivel 3: Pro</td>
                <td>25% de las Croins que manden en tu Stream</td>
                <td className="highlight-cell">~$0.42 MXN x mensaje Eco</td>
                <td>
                  <ul>
                    <li>🎙️ 750 audios Eco</li>
                    <li>📅 16 Días de transmisión activa</li>
                  </ul>
                </td>
                <td>
                  <ul>
                    <li>🎙️ 3000 audios Eco</li>
                    <li>📅 21 Días de transmisión activa</li>
                    <li>🛡️ Invitación y revisión manual</li>
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="rank-cell">💎 Nivel 4: Partner</td>
                <td>30% de las Croins que manden en tu Stream</td>
                <td className="highlight-cell">~$0.50 MXN x mensaje Eco</td>
                <td>
                  <ul>
                    <li>🎙️ 1500 audios Eco</li>
                    <li>📅 21 Días de transmisión activa</li>
                  </ul>
                </td>
                <td>
                  <span style={{ color: 'var(--text-secondary)' }}>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rules-section">
          <h3>Reglamento del Programa</h3>
          <div className="rules-card">
            <div className="rule-item">
              <h4>📅 Día de Transmisión Activa</h4>
              <p>Se contabilizará un día válido cuando el creador mantenga Talking Cro.ow conectado a su LIVE durante un mínimo de <strong>40 minutos</strong>.</p>
            </div>
            <div className="rule-item">
              <h4>🎙️ Mensajes Eco</h4>
              <p>Los mensajes Eco son aquellos que se leen en el chat con la voz clonada de tus espectadores. Aplica exclusivamente para mensajes canjeados con Croins comprados (dinero real). Los audios con Croins promocionales no suman para subir de nivel ni generan ingresos, ten en cuenta que todos los usuarios tienen 2 mensajes Eco gratuitos al crear su cuenta.</p>
            </div>
            <div className="rule-item">
              <h4>🤝 Comunidad Sana</h4>
              <p>Para poder ascender a los niveles Pro y Partner, el sistema validará que los audios generados en ese mes provengan de al menos <strong>10 personas distintas</strong>.</p>
            </div>
            <div className="rule-item">
              <h4>🛡️ Escudo de Inmunidad</h4>
              <p>Todos los creadores tienen derecho a <strong>2 tokens de Inmunidad al año</strong>. Podrán activarlos manualmente con un botón desde su panel de Retiros. Al activarlo, su nivel actual queda protegido durante ese mes calendario aunque no cumplan las métricas (ideal para vacaciones o problemas de salud).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueShareSection;
