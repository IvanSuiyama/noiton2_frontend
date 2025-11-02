import { NativeModules, Alert } from 'react-native';
import { getToken, apiCall } from './authService';

const { FilePickerModule } = NativeModules;

interface MetricasData {
  total: number;
  concluidas: number;
  atrasadas: number;
  emAndamento: number;
  pendentes: number;
}

interface WorkspaceInfo {
  id_workspace: number;
  nome: string;
  tipo: 'individual' | 'equipe';
}

class PdfService {
  
  /**
   * Gerar e baixar relatório HTML das métricas
   */
  async gerarRelatorioPDF(
    metricas: MetricasData, 
    workspaceInfo: WorkspaceInfo | null,
    isEquipeView: boolean,
    userEmail: string
  ): Promise<boolean> {
    try {
      console.log('📄 Gerando relatório HTML...');

      // Verificar se o módulo nativo está disponível
      if (!FilePickerModule || !FilePickerModule.saveTextToFile) {
        Alert.alert('Erro', 'Funcionalidade de salvar arquivo não está disponível.');
        return false;
      }

      const dataAtual = new Date().toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const percentuais = {
        concluidas: metricas.total > 0 ? Math.round((metricas.concluidas / metricas.total) * 100) : 0,
        em_andamento: metricas.total > 0 ? Math.round((metricas.emAndamento / metricas.total) * 100) : 0,
        atrasadas: metricas.total > 0 ? Math.round((metricas.atrasadas / metricas.total) * 100) : 0,
        pendentes: metricas.total > 0 ? Math.round((metricas.pendentes / metricas.total) * 100) : 0,
      };

      // Gerar HTML estilizado
      const htmlContent = this.gerarHTMLRelatorio(
        metricas, 
        percentuais, 
        workspaceInfo, 
        isEquipeView, 
        userEmail, 
        dataAtual
      );

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const tipoVisualizacao = isEquipeView ? 'equipe' : 'individual';
      const nomeWorkspace = (workspaceInfo?.nome || 'workspace').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `relatorio_metricas_${nomeWorkspace}_${tipoVisualizacao}_${timestamp}.html`;

      console.log('💾 Salvando arquivo:', fileName);

      // Salvar arquivo usando módulo nativo
      const result = await FilePickerModule.saveTextToFile(htmlContent, fileName);

      console.log('✅ Arquivo salvo:', result);

      Alert.alert(
        'Relatório Salvo',
        `Relatório "${fileName}" foi salvo na pasta Downloads.\n\nVocê pode abri-lo em qualquer navegador ou converter para PDF.`,
        [{ text: 'OK' }]
      );

      return true;

    } catch (error: any) {
      console.error('❌ Erro ao gerar relatório:', error);
      Alert.alert('Erro', 'Não foi possível salvar o relatório.');
      return false;
    }
  }

  /**
   * Gerar conteúdo HTML formatado para o relatório
   */
  private gerarHTMLRelatorio(
    metricas: MetricasData,
    percentuais: any,
    workspaceInfo: WorkspaceInfo | null,
    isEquipeView: boolean,
    userEmail: string,
    dataAtual: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Métricas - Noiton</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.2em;
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .info-card strong {
            color: #667eea;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            text-align: center;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .metric-card.concluidas {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
        }
        .metric-card.andamento {
            background: linear-gradient(135deg, #FF9800, #f57c00);
            color: white;
        }
        .metric-card.atrasadas {
            background: linear-gradient(135deg, #F44336, #d32f2f);
            color: white;
        }
        .metric-card.pendentes {
            background: linear-gradient(135deg, #9E9E9E, #757575);
            color: white;
        }
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .metric-label {
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        .metric-percent {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .analysis {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }
        .analysis h3 {
            color: #667eea;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 0.9em;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Relatório de Métricas</h1>
            <p>Sistema Noiton - Gestão de Tarefas</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📋 Informações Gerais</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <strong>Workspace:</strong><br>
                        ${workspaceInfo?.nome || 'Workspace'}
                    </div>
                    <div class="info-card">
                        <strong>Tipo:</strong><br>
                        ${workspaceInfo?.tipo || 'Individual'}
                    </div>
                    <div class="info-card">
                        <strong>Visualização:</strong><br>
                        ${isEquipeView ? 'Equipe' : 'Individual'}
                    </div>
                    <div class="info-card">
                        <strong>Usuário:</strong><br>
                        ${userEmail}
                    </div>
                    <div class="info-card">
                        <strong>Data de Geração:</strong><br>
                        ${dataAtual}
                    </div>
                    <div class="info-card">
                        <strong>Total de Tarefas:</strong><br>
                        <span style="font-size: 1.5em; color: #667eea;">${metricas.total}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📈 Métricas das Tarefas</h2>
                <div class="metrics-grid">
                    <div class="metric-card concluidas">
                        <div class="metric-value">${metricas.concluidas}</div>
                        <div class="metric-label">Concluídas</div>
                        <div class="metric-percent">${percentuais.concluidas}%</div>
                    </div>
                    <div class="metric-card andamento">
                        <div class="metric-value">${metricas.emAndamento}</div>
                        <div class="metric-label">Em Andamento</div>
                        <div class="metric-percent">${percentuais.em_andamento}%</div>
                    </div>
                    <div class="metric-card atrasadas">
                        <div class="metric-value">${metricas.atrasadas}</div>
                        <div class="metric-label">Atrasadas</div>
                        <div class="metric-percent">${percentuais.atrasadas}%</div>
                    </div>
                    <div class="metric-card pendentes">
                        <div class="metric-value">${metricas.pendentes}</div>
                        <div class="metric-label">Pendentes</div>
                        <div class="metric-percent">${percentuais.pendentes}%</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📊 Análise de Desempenho</h2>
                <div class="analysis">
                    <h3>Análise Detalhada</h3>
                    <p>${this.gerarAnaliseMetricas(metricas).replace(/\n/g, '<br>')}</p>
                </div>
            </div>

            <div class="section">
                <h2>📋 Resumo Executivo</h2>
                <div class="analysis">
                    <h3>Conclusões e Recomendações</h3>
                    <p>${this.gerarResumoExecutivo(metricas, percentuais).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema Noiton</p>
            <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Gerar PDF simples localmente (fallback caso a API não esteja disponível)
   */
  async gerarPDFLocal(
    metricas: MetricasData,
    workspaceInfo: WorkspaceInfo | null,
    isEquipeView: boolean,
    userEmail: string
  ): Promise<boolean> {
    try {
      // Esta seria uma implementação local usando uma biblioteca como react-native-pdf-lib
      // Por enquanto, vamos mostrar um preview dos dados que seriam incluídos no PDF
      
      const dataAtual = new Date().toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const relatorioTexto = `
📊 RELATÓRIO DE MÉTRICAS

Workspace: ${workspaceInfo?.nome || 'Workspace'}
Tipo: ${workspaceInfo?.tipo || 'Individual'} (Visualização: ${isEquipeView ? 'Equipe' : 'Individual'})
Usuário: ${userEmail}
Data: ${dataAtual}

📈 MÉTRICAS DAS TAREFAS:
• Total: ${metricas.total}
• Concluídas: ${metricas.concluidas} (${metricas.total > 0 ? Math.round((metricas.concluidas / metricas.total) * 100) : 0}%)
• Em Andamento: ${metricas.emAndamento} (${metricas.total > 0 ? Math.round((metricas.emAndamento / metricas.total) * 100) : 0}%)
• Atrasadas: ${metricas.atrasadas} (${metricas.total > 0 ? Math.round((metricas.atrasadas / metricas.total) * 100) : 0}%)
• Pendentes: ${metricas.pendentes} (${metricas.total > 0 ? Math.round((metricas.pendentes / metricas.total) * 100) : 0}%)

📊 ANÁLISE:
${this.gerarAnaliseMetricas(metricas)}
      `.trim();

      Alert.alert(
        'Prévia do Relatório PDF',
        relatorioTexto,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar', 
            onPress: () => {
              // Por enquanto, apenas mostra que seria gerado
              Alert.alert('PDF Local', 'Funcionalidade de geração local será implementada com react-native-pdf-lib');
            }
          }
        ]
      );

      return true;

    } catch (error) {
      console.error('❌ Erro ao gerar PDF local:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório local.');
      return false;
    }
  }

  /**
   * Gerar análise textual das métricas
   */
  private gerarAnaliseMetricas(metricas: MetricasData): string {
    if (metricas.total === 0) {
      return 'Nenhuma tarefa encontrada no workspace.';
    }

    const percentualConcluidas = Math.round((metricas.concluidas / metricas.total) * 100);
    const percentualAtrasadas = Math.round((metricas.atrasadas / metricas.total) * 100);

    let analise = [];

    if (percentualConcluidas >= 80) {
      analise.push('✅ Excelente produtividade! Mais de 80% das tarefas concluídas.');
    } else if (percentualConcluidas >= 60) {
      analise.push('👍 Boa produtividade. Mais de 60% das tarefas concluídas.');
    } else if (percentualConcluidas >= 40) {
      analise.push('⚠️ Produtividade moderada. Considere revisar processos.');
    } else {
      analise.push('🚨 Baixa produtividade. Recomenda-se análise detalhada.');
    }

    if (percentualAtrasadas > 20) {
      analise.push('⏰ Alto número de tarefas atrasadas. Revisar prazos.');
    } else if (percentualAtrasadas > 10) {
      analise.push('⚡ Algumas tarefas atrasadas. Monitorar prazos.');
    } else {
      analise.push('📅 Boa gestão de prazos. Poucas tarefas atrasadas.');
    }

    return analise.join('\n');
  }

  /**
   * Gerar resumo executivo das métricas
   */
  private gerarResumoExecutivo(metricas: MetricasData, percentuais: any): string {
    if (metricas.total === 0) {
      return 'Workspace sem tarefas cadastradas. Recomenda-se criar tarefas para iniciar o acompanhamento.';
    }

    const resumo = [];
    
    // Análise geral
    if (percentuais.concluidas >= 70) {
      resumo.push('🎯 Status: EXCELENTE - Alto índice de conclusão de tarefas.');
    } else if (percentuais.concluidas >= 50) {
      resumo.push('📊 Status: BOM - Índice satisfatório de conclusão.');
    } else if (percentuais.concluidas >= 30) {
      resumo.push('⚠️ Status: ATENÇÃO - Baixo índice de conclusão.');
    } else {
      resumo.push('🚨 Status: CRÍTICO - Índice muito baixo de conclusão.');
    }

    // Análise de atrasos
    if (percentuais.atrasadas === 0) {
      resumo.push('⏰ Gestão de Prazo: EXCELENTE - Nenhuma tarefa atrasada.');
    } else if (percentuais.atrasadas <= 10) {
      resumo.push('⏰ Gestão de Prazo: BOA - Poucos atrasos detectados.');
    } else if (percentuais.atrasadas <= 25) {
      resumo.push('⏰ Gestão de Prazo: ATENÇÃO - Atrasos significativos.');
    } else {
      resumo.push('⏰ Gestão de Prazo: CRÍTICA - Muitas tarefas atrasadas.');
    }

    // Recomendações
    resumo.push('\n📋 RECOMENDAÇÕES:');
    
    if (percentuais.em_andamento > 50) {
      resumo.push('• Foque na conclusão das tarefas em andamento');
    }
    
    if (percentuais.atrasadas > 15) {
      resumo.push('• Revise prazos e redistribua tarefas atrasadas');
    }
    
    if (percentuais.pendentes > 30) {
      resumo.push('• Priorize o início das tarefas pendentes');
    }
    
    if (metricas.total < 5) {
      resumo.push('• Considere criar mais tarefas para melhor organização');
    }

    return resumo.join('\n');
  }

  /**
   * Verificar se o serviço de relatório está disponível
   */
  async verificarDisponibilidade(): Promise<boolean> {
    // Para relatório de texto, sempre disponível
    return true;
  }
}

export default new PdfService();