import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../router';
import { useTheme } from '../theme/ThemeContext';

type AjudaScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Ajuda'>;

type Props = {
  navigation: AjudaScreenNavigationProp;
};

interface FuncionalidadeApp {
  icone: string;
  titulo: string;
  descricao: string;
}

const AjudaScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  const funcionalidades: FuncionalidadeApp[] = [
    {
      icone: '📝',
      titulo: 'Criar Tarefas',
      descricao: 'Crie tarefas com título, descrição, categoria e prazo'
    },
    {
      icone: '🏢',
      titulo: 'Workspaces',
      descricao: 'Organize suas tarefas em diferentes espaços de trabalho'
    },
    {
      icone: '👥',
      titulo: 'Membros',
      descricao: 'Adicione membros ao seu workspace e atribua tarefas'
    },
    {
      icone: '📅',
      titulo: 'Calendário',
      descricao: 'Visualize suas tarefas organizadas por data'
    },
    {
      icone: '⭐',
      titulo: 'Favoritos',
      descricao: 'Marque tarefas importantes como favoritas'
    },
    {
      icone: '🔔',
      titulo: 'Notificações',
      descricao: 'Receba lembretes sobre prazos de tarefas'
    },
    {
      icone: '🏪',
      titulo: 'Lojinha',
      descricao: 'Personalize seu perfil com avatares e temas'
    },
    {
      icone: '🌙',
      titulo: 'Temas',
      descricao: 'Alterne entre tema claro e escuro'
    },
  ];

  const baixarPDF = () => {
    Alert.alert(
      'Download PDF',
      'O PDF com o guia completo do app será baixado em breve!',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Baixar',
          onPress: () => {
            // Aqui você implementaria o download do PDF
            Alert.alert('Download iniciado!', 'O arquivo será salvo na pasta Downloads');
          }
        }
      ]
    );
  };

  const mostrarEmailSuporte = () => {
    Alert.alert(
      'Contato para Suporte',
      'Para suporte técnico, entre em contato através do email:\n\nivan@gmail.com',
      [{ text: 'OK' }]
    );
  };

  const renderFuncionalidade = (func: FuncionalidadeApp, index: number) => (
    <View key={index} style={[styles.funcCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.funcIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
        <Text style={styles.funcIcon}>{func.icone}</Text>
      </View>
      <View style={styles.funcContent}>
        <Text style={[styles.funcTitulo, { color: theme.colors.text }]}>
          {func.titulo}
        </Text>
        <Text style={[styles.funcDescricao, { color: theme.colors.textSecondary }]}>
          {func.descricao}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← Voltar</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>❓ Ajuda</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Seção de Downloads */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            📄 Documentação
          </Text>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
            onPress={baixarPDF}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={styles.actionIcon}>📋</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitulo, { color: theme.colors.text }]}>
                Baixar Guia Completo (PDF)
              </Text>
              <Text style={[styles.actionDescricao, { color: theme.colors.textSecondary }]}>
                Manual detalhado com todas as funcionalidades
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Funcionalidades */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🚀 O que você pode fazer no app
          </Text>
          
          {funcionalidades.map(renderFuncionalidade)}
        </View>

        {/* Sistema de Temas */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🎨 Sistema de Temas
          </Text>
          
          <View style={[styles.docContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              O sistema de temas permite personalizar a aparência do aplicativo com 4 opções distintas. Os usuários podem alternar entre temas gratuitos e comprar temas premium usando pontos.
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>🎨 Temas Disponíveis:</Text>
            
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              <Text style={[styles.temaDestaque, { color: theme.colors.primary }]}>☀️ Claro (Gratuito)</Text>{'\n'}
              Tema limpo e moderno com fundo claro. Ideal para ambientes bem iluminados.{'\n\n'}
              
              <Text style={[styles.temaDestaque, { color: theme.colors.primary }]}>🌙 Escuro (Gratuito)</Text>{'\n'}
              Tema padrão com fundo escuro. Economia de bateria e uso noturno.{'\n\n'}
              
              <Text style={[styles.temaDestaque, { color: theme.colors.warning }]}>📋 Trello (Premium - P 3.60)</Text>{'\n'}
              Inspirado no design profissional do Trello. Ambiente de trabalho e produtividade.{'\n\n'}
              
              <Text style={[styles.temaDestaque, { color: theme.colors.warning }]}>🌟 Noiton 1.0 (Premium - P 10.00)</Text>{'\n'}
              Homenagem à versão original do Noiton. Visual nostálgico e elegante.
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>🔧 Como Usar Temas:</Text>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              1. Acesse o <Text style={{ fontWeight: 'bold' }}>Card do Usuário</Text> na tela inicial{'\n'}
              2. Toque em <Text style={{ fontWeight: 'bold' }}>"🎨 Seletor de Temas"</Text>{'\n'}
              3. Visualize os temas disponíveis{'\n'}
              4. Selecione o tema desejado{'\n'}
              5. Para temas premium, efetue a compra primeiro na lojinha
            </Text>
          </View>
        </View>

        {/* Sistema de Lojinha */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🏪 Sistema de Lojinha
          </Text>
          
          <View style={[styles.docContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              A Lojinha é um sistema de recompensas baseado em pontos onde os usuários podem adquirir temas premium e ícones personalizados usando pontos ganhos através de atividades no aplicativo.
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>💰 Sistema de Pontos:</Text>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              <Text style={[styles.pontosDestaque, { color: theme.colors.success }]}>Como Ganhar Pontos:</Text>{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>+0.5 pontos</Text> por tarefa completada no prazo{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Bonus futuros:</Text> Participação em projetos, colaboração em equipe{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>Atividades diárias:</Text> Login consecutivo, uso ativo do app
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>🛍️ Itens Disponíveis:</Text>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              <Text style={[styles.itemDestaque, { color: theme.colors.info }]}>🎨 Temas Premium:</Text>{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>📋 Tema Trello (P 3.60):</Text> Design profissional inspirado no Trello{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>🌟 Tema Noiton 1.0 (P 10.00):</Text> Homenagem exclusiva à versão original{'\n\n'}
              
              <Text style={[styles.itemDestaque, { color: theme.colors.info }]}>🎯 Ícones Personalizados:</Text>{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>👤 Ícones do Usuário:</Text> Personalize seu avatar{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>🏢 Ícones do Workspace:</Text> Customize seu espaço de trabalho{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>👥 Ícones dos Membros:</Text> Destaque sua equipe{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>📊 Ícones das Métricas:</Text> Personalize suas estatísticas
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>🔄 Como Comprar:</Text>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              1. <Text style={{ fontWeight: 'bold' }}>Navegação:</Text> Acesse a 🏪 Lojinha{'\n'}
              2. <Text style={{ fontWeight: 'bold' }}>Visualização:</Text> Sistema mostra pontos atuais e itens{'\n'}
              3. <Text style={{ fontWeight: 'bold' }}>Seleção:</Text> Escolha o item desejado{'\n'}
              4. <Text style={{ fontWeight: 'bold' }}>Validação:</Text> Sistema verifica saldo suficiente{'\n'}
              5. <Text style={{ fontWeight: 'bold' }}>Confirmação:</Text> Modal de confirmação aparece{'\n'}
              6. <Text style={{ fontWeight: 'bold' }}>Transação:</Text> Pontos são debitados{'\n'}
              7. <Text style={{ fontWeight: 'bold' }}>Desbloqueio:</Text> Item é liberado automaticamente
            </Text>
            
            <Text style={[styles.subTitulo, { color: theme.colors.text }]}>💡 Dicas para Usuários:</Text>
            <Text style={[styles.docTexto, { color: theme.colors.text }]}>
              <Text style={[styles.dicaDestaque, { color: theme.colors.success }]}>Maximizar Pontos:</Text>{'\n'}
              • Complete todas as tarefas no prazo{'\n'}
              • Mantenha-se ativo diariamente{'\n'}
              • Participe de projetos colaborativos{'\n'}
              • Use todas as funcionalidades do app{'\n\n'}
              
              <Text style={[styles.dicaDestaque, { color: theme.colors.warning }]}>Estratégia de Compra:</Text>{'\n'}
              • Priorize itens que mais usa{'\n'}
              • Economize para itens premium{'\n'}
              • Fique atento a promoções{'\n'}
              • Teste previews antes de comprar{'\n\n'}
              
              <Text style={[styles.dicaDestaque, { color: theme.colors.info }]}>Experiência Otimizada:</Text>{'\n'}
              • Use temas adequados ao ambiente{'\n'}
              • Aproveite economia de bateria do tema escuro{'\n'}
              • Combine temas com seu estilo de trabalho{'\n'}
              • Experimente diferentes combinações
            </Text>
          </View>
        </View>

        {/* Seção de Suporte */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            🆘 Precisa de mais ajuda?
          </Text>
          
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
            onPress={mostrarEmailSuporte}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
              <Text style={styles.actionIcon}>💬</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitulo, { color: theme.colors.text }]}>
                Ver Email de Suporte
              </Text>
              <Text style={[styles.actionDescricao, { color: theme.colors.textSecondary }]}>
                Visualizar informações de contato
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: theme.colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Dicas */}
        <View style={styles.secaoContainer}>
          <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
            💡 Dicas Rápidas
          </Text>
          
          <View style={[styles.dicsContainer, { backgroundColor: theme.colors.info + '20' }]}>
            <Text style={[styles.dicaTexto, { color: theme.colors.text }]}>
              • Mantenha suas tarefas organizadas por categoria{'\n'}
              • Use prazos realistas para suas tarefas{'\n'}
              • Convide membros para colaborar em projetos{'\n'}
              • Complete tarefas no prazo para ganhar pontos{'\n'}
              • Explore a lojinha para personalizar seu perfil
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  secaoContainer: {
    marginBottom: 24,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionDescricao: {
    fontSize: 14,
  },
  actionArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  funcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  funcIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  funcIcon: {
    fontSize: 20,
  },
  funcContent: {
    flex: 1,
  },
  funcTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  funcDescricao: {
    fontSize: 12,
  },
  dicsContainer: {
    padding: 16,
    borderRadius: 12,
  },
  dicaTexto: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 32,
  },
  docContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  subTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  docTexto: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  temaDestaque: {
    fontWeight: 'bold',
  },
  pontosDestaque: {
    fontWeight: 'bold',
  },
  itemDestaque: {
    fontWeight: 'bold',
  },
  dicaDestaque: {
    fontWeight: 'bold',
  },
});

export default AjudaScreen;