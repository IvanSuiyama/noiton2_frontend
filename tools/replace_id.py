#!/usr/bin/env python3
"""
Script para encontrar e substituir IPs hardcoded em um projeto React Native
Versão atualizada com locais específicos mapeados
"""

import os
import re
import argparse
from pathlib import Path

# 🎯 LISTA COMPLETA DE LOCAIS COM IPS HARDCODED
HARDCODED_IP_LOCATIONS = [
    # authService.ts
    {
        'file': 'services/authService.ts',
        'line': 7,
        'pattern': r"const API_BASE = 'http://192\.168\.15\.14:3000';"
    },
    # networkinManager.ts  
    {
        'file': 'services/networkinManager.ts',
        'line': 312,
        'pattern': r"console\.log\(`🔗 \[Sync\] URL: http://192\.168\.15\.14:3000/tarefas/\$\{task\.id_tarefa\}`\);"
    },
    {
        'file': 'services/networkinManager.ts', 
        'line': 315,
        'pattern': r"const response = await fetch\(`http://192\.168\.15\.14:3000/tarefas/\$\{task\.id_tarefa\}`, \{"
    },
    # cadUsuario.tsx
    {
        'file': 'components_ivan/usuario/cadUsuario.tsx',
        'line': 82,
        'pattern': r"const response = await fetch\('http://192\.168\.15\.14:3000/usuarios', \{"
    },
    # WelcomeScreen.tsx
    {
        'file': 'components_ivan/welcome/WelcomeScreen.tsx',
        'line': 50,
        'pattern': r"const response = await fetch\(`http://192\.168\.15\.14:3000/auth/verificar-email\?email=\$\{encodeURIComponent\(email\)\}`, \{"
    },
    {
        'file': 'components_ivan/welcome/WelcomeScreen.tsx',
        'line': 63,
        'pattern': r"const loginResponse = await fetch\('http://192\.168\.15\.14:3000/auth/login-google', \{"
    },
    # adminServices.ts
    {
        'file': 'services/adminServices.ts',
        'line': 5,
        'pattern': r"const API_BASE = 'http://192\.168\.15\.14:3000';"
    },
    # syncManager.ts
    {
        'file': 'services/syncManager.ts',
        'line': 269,
        'pattern': r"const response = await fetch\('http://192\.168\.15\.14:3000/sync/offline', \{"
    },
    {
        'file': 'services/syncManager.ts',
        'line': 399,
        'pattern': r"const response = await fetch\(`http://192\.168\.15\.14:3000/sync/initial-data/\$\{encodeURIComponent\(email\)\}`, \{"
    },
    # loginOffline.ts
    {
        'file': 'services/loginOffline.ts',
        'line': 326,
        'pattern': r"const response = await fetch\(`http://192\.168\.15\.14:3000/sync/initial-data/\$\{encodeURIComponent\(email\)\}`, \{"
    },
    {
        'file': 'services/loginOffline.ts',
        'line': 390,
        'pattern': r"const response = await fetch\('http://192\.168\.15\.14:3000/sync/offline', \{"
    },
    # anexoService.ts
    {
        'file': 'services/anexoService.ts',
        'line': 443,
        'pattern': r"const baseUrl = 'http://192\.168\.15\.14:3000';"
    },
    {
        'file': 'services/anexoService.ts',
        'line': 496,
        'pattern': r"const API_BASE = 'http://192\.168\.15\.14:3000';"
    }
]

def find_ip_addresses_in_file(file_path):
    """Encontra endereços IP em um arquivo"""
    ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
    ips_found = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            ips = re.findall(ip_pattern, content)
            
            # Filtra IPs válidos (evita números como 255.255.255.0 em outros contextos)
            valid_ips = []
            for ip in ips:
                # Verifica se é um IP válido (não parte de outros números)
                if is_valid_ip_context(content, ip, file_path):
                    valid_ips.append(ip)
            
            return list(set(valid_ips))  # Remove duplicatas
            
    except Exception as e:
        print(f"❌ Erro ao ler arquivo {file_path}: {e}")
        return []

def is_valid_ip_context(content, ip, file_path):
    """Verifica se o IP encontrado é realmente um endereço IP em uso"""
    # IPs comuns em desenvolvimento local
    common_local_ips = ['192.168.', '10.0.', '172.16.', '172.17.', '172.18.', '172.19.', 
                       '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
                       '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
                       '127.0.0.1', 'localhost', '0.0.0.0']
    
    # Verifica se é um IP local comum
    if any(ip.startswith(prefix) for prefix in common_local_ips):
        return True
    
    # Verifica contexto no arquivo (evita falsos positivos)
    lines = content.split('\n')
    for line_num, line in enumerate(lines, 1):
        if ip in line:
            # Contextos onde IPs são usados
            ip_contexts = [
                'http://', 'https://', 'API_BASE', 'api', 'fetch', 'axios',
                'baseURL', 'endpoint', 'url', 'HOST', 'PORT', 'localhost',
                'BASE_URL', 'API_URL', 'SERVER_URL'
            ]
            
            if any(context in line.lower() for context in [c.lower() for c in ip_contexts]):
                return True
            # Verifica se está em uma string de URL
            if re.search(rf'[\'"]http://{ip}|\'https://{ip}', line):
                return True
    
    return False

def replace_ip_precise(project_path, old_ip, new_ip):
    """Substitui IPs usando os locais específicos mapeados"""
    total_replacements = 0
    files_modified = []
    
    for location in HARDCODED_IP_LOCATIONS:
        file_path = os.path.join(project_path, location['file'])
        
        if not os.path.exists(file_path):
            print(f"⚠️  Arquivo não encontrado: {location['file']}")
            continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Substitui o IP específico neste arquivo
            old_content = content
            content = content.replace(old_ip, new_ip)
            
            if content != old_content:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(content)
                
                # Conta quantas substituições foram feitas
                replacements = old_content.count(old_ip)
                total_replacements += replacements
                
                if location['file'] not in files_modified:
                    files_modified.append(location['file'])
                
                print(f"   ✅ {location['file']}: {replacements} substituição(ões)")
        
        except Exception as e:
            print(f"❌ Erro ao processar {location['file']}: {e}")
    
    return total_replacements, files_modified

def replace_ip_in_file(file_path, old_ip, new_ip):
    """Substitui um IP por outro em um arquivo (função original mantida como fallback)"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Substitui o IP em diferentes contextos
        replacements = 0
        
        # Substitui em URLs http://IP
        pattern_http = re.compile(rf'http://{re.escape(old_ip)}', re.IGNORECASE)
        content, count_http = pattern_http.subn(f'http://{new_ip}', content)
        replacements += count_http
        
        # Substitui em URLs https://IP
        pattern_https = re.compile(rf'https://{re.escape(old_ip)}', re.IGNORECASE)
        content, count_https = pattern_https.subn(f'https://{new_ip}', content)
        replacements += count_https
        
        # Substitui IPs soltos (em variáveis, strings, etc.)
        pattern_ip_only = re.compile(rf'\b{re.escape(old_ip)}\b')
        content, count_ip = pattern_ip_only.subn(new_ip, content)
        replacements += count_ip
        
        if replacements > 0:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            
            return replacements
        
        return 0
        
    except Exception as e:
        print(f"❌ Erro ao substituir IP em {file_path}: {e}")
        return 0

def scan_project_for_ips(project_path):
    """Escaneia todo o projeto em busca de IPs hardcoded"""
    extensions = ['.js', '.jsx', '.ts', '.tsx', '.java', '.kt', '.json', '.xml', '.gradle']
    ip_files = {}
    
    print(f"🔍 Escaneando projeto em: {project_path}")
    
    for root, dirs, files in os.walk(project_path):
        # Ignora algumas pastas comuns
        ignore_dirs = ['node_modules', '.git', 'build', 'dist', '__pycache__', 'backend_temporario', '.vscode', '.bundle', '_tests_', '.kotlin', '.gradle', 'release', 'gradle', 'tools']
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                ips = find_ip_addresses_in_file(file_path)
                
                if ips:
                    ip_files[file_path] = ips
    
    return ip_files

def main():
    parser = argparse.ArgumentParser(description='Substitui IPs hardcoded em um projeto React Native')
    parser.add_argument('--project-path', default='.', help='Caminho para o projeto (padrão: diretório atual)')
    parser.add_argument('--mode', choices=['scan', 'precise'], default='precise', help='Modo: scan (escaneia) ou precise (usa locais mapeados)')
    parser.add_argument('--old-ip', help='IP atual para substituir (opcional)')
    parser.add_argument('--new-ip', help='Novo IP (opcional)')
    
    args = parser.parse_args()
    
    project_path = os.path.abspath(args.project_path)
    
    if not os.path.exists(project_path):
        print(f"❌ Caminho do projeto não encontrado: {project_path}")
        return
    
    print("🔧 SUBSTITUIDOR DE IPs HARDCODED")
    print("=" * 60)
    print(f"📂 Projeto: {project_path}")
    print(f"⚙️  Modo: {args.mode}")
    
    if args.mode == 'precise':
        # MODO PRECISO - USA LOCAIS MAPEADOS
        print(f"\n📋 LOCAIS MAPEADOS ({len(HARDCODED_IP_LOCATIONS)} arquivos):")
        for i, location in enumerate(HARDCODED_IP_LOCATIONS, 1):
            print(f"   {i:2d}. {location['file']} (linha ~{location['line']})")
        
        # Detecta IP atual automaticamente
        current_ip = None
        sample_file = os.path.join(project_path, 'services/authService.ts')
        if os.path.exists(sample_file):
            with open(sample_file, 'r') as f:
                content = f.read()
                match = re.search(r'192\.168\.\d+\.\d+', content)
                if match:
                    current_ip = match.group()
        
        old_ip = args.old_ip or current_ip
        if not old_ip:
            old_ip = input("\n🔍 Digite o IP ATUAL a ser substituído: ").strip()
        else:
            print(f"\n🔍 IP atual detectado: {old_ip}")
        
        new_ip = args.new_ip
        if not new_ip:
            new_ip = input("🔧 Digite o NOVO IP: ").strip()
        
        if not old_ip or not new_ip:
            print("❌ IPs não informados. Operação cancelada.")
            return
        
        # Valida IPs
        ip_pattern = r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$'
        if not re.match(ip_pattern, old_ip) or not re.match(ip_pattern, new_ip):
            print("❌ IP inválido. Use o formato: 192.168.1.100")
            return
        
        if old_ip == new_ip:
            print("❌ IPs são iguais. Nada para fazer.")
            return
        
        # Confirmação
        print(f"\n⚠️  SUBSTITUIÇÃO PRECISA:")
        print(f"   📤 De: {old_ip}")
        print(f"   📥 Para: {new_ip}")
        print(f"   📁 Arquivos: {len(HARDCODED_IP_LOCATIONS)}")
        
        if not args.old_ip or not args.new_ip:  # Só pede confirmação se não passou por argumentos
            confirm = input("\n❓ Confirmar substituição? (s/N): ").strip().lower()
            if confirm not in ['s', 'sim', 'y', 'yes']:
                print("❌ Operação cancelada.")
                return
        
        # Executa substituição precisa
        print(f"\n🔄 Executando substituição precisa...")
        total_replacements, files_modified = replace_ip_precise(project_path, old_ip, new_ip)
        
        # Resumo
        print("\n" + "=" * 60)
        print("📊 RESUMO DA OPERAÇÃO PRECISA:")
        print(f"   📁 Arquivos modificados: {len(files_modified)}")
        print(f"   🔄 Substituições realizadas: {total_replacements}")
        print(f"   📤 IP antigo: {old_ip}")
        print(f"   📥 IP novo: {new_ip}")
        print("\n✅ Substituição precisa concluída com sucesso!")
        
    else:
        # MODO SCAN - ESCANEIA O PROJETO (código original)
        ip_files = scan_project_for_ips(project_path)
        
        if not ip_files:
            print("✅ Nenhum IP hardcoded encontrado no projeto!")
            return
        
        # Mostra IPs encontrados
        print("\n📋 IPs HARDCODED ENCONTRADOS:")
        print("=" * 60)
        
        all_ips = set()
        for file_path, ips in ip_files.items():
            print(f"\n📁 {os.path.relpath(file_path, project_path)}")
            for ip in ips:
                print(f"   🔹 {ip}")
                all_ips.add(ip)
        
        print(f"\n🎯 Total de IPs únicos encontrados: {len(all_ips)}")
        
        if not all_ips:
            return
        
        # Pede o novo IP
        print("\n" + "=" * 60)
        new_ip = input("🔧 Digite o NOVO IP para substituir todos os encontrados: ").strip()
        
        if not new_ip:
            print("❌ Nenhum IP informado. Operação cancelada.")
            return
        
        # Valida o IP
        ip_pattern = r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$'
        if not re.match(ip_pattern, new_ip):
            print("❌ IP inválido. Use o formato: 192.168.1.100")
            return
        
        # Confirmação
        print(f"\n⚠️  ATENÇÃO: Isso substituirá {len(all_ips)} IP(s) por '{new_ip}'")
        confirm = input("❓ Confirmar substituição? (s/N): ").strip().lower()
        
        if confirm not in ['s', 'sim', 'y', 'yes']:
            print("❌ Operação cancelada.")
            return
        
        # Realiza as substituições
        print(f"\n🔄 Realizando substituições...")
        total_replacements = 0
        files_modified = 0
        
        for old_ip in all_ips:
            print(f"\n📝 Substituindo '{old_ip}' → '{new_ip}'")
            
            for file_path in ip_files.keys():
                replacements = replace_ip_in_file(file_path, old_ip, new_ip)
                
                if replacements > 0:
                    print(f"   ✅ {os.path.relpath(file_path, project_path)}: {replacements} substituição(ões)")
                    total_replacements += replacements
                    files_modified += 1
        
        # Resumo
        print("\n" + "=" * 60)
        print("📊 RESUMO DA OPERAÇÃO:")
        print(f"   📁 Arquivos modificados: {files_modified}")
        print(f"   🔄 Substituições realizadas: {total_replacements}")
        print(f"   🎯 Novo IP configurado: {new_ip}")
        print("\n✅ Operação concluída com sucesso!")

if __name__ == "__main__":
    main()

# ================================================================
# 📖 EXEMPLOS DE USO - MÁXIMA PRECISÃO
# ================================================================

"""
🎯 MODO PRECISO (RECOMENDADO) - Substitui nos locais exatos mapeados:

1️⃣ Substituição automática (mais rápida):
   python3 tools/replace_id.py --old-ip 192.168.15.14 --new-ip 192.168.1.100

2️⃣ Modo interativo (detecta IP atual automaticamente):
   python3 tools/replace_id.py
   
3️⃣ Com caminho específico do projeto:
   python3 tools/replace_id.py --project-path /caminho/para/projeto --old-ip 192.168.15.14 --new-ip 192.168.1.50

📋 LOCAIS MAPEADOS (13 arquivos com IPs hardcoded):
   ✅ services/authService.ts
   ✅ services/networkinManager.ts  
   ✅ services/adminServices.ts
   ✅ services/syncManager.ts
   ✅ services/loginOffline.ts
   ✅ services/anexoService.ts
   ✅ components_ivan/usuario/cadUsuario.tsx
   ✅ components_ivan/welcome/WelcomeScreen.tsx

🔍 MODO SCAN (para explorar outros IPs):
   python3 tools/replace_id.py --mode scan

⚡ EXEMPLO PRÁTICO LINUX:
   # IP atual do seu projeto: 192.168.15.14
   # Novo IP (exemplo): 192.168.1.100
   python3 tools/replace_id.py --old-ip 192.168.15.14 --new-ip 192.168.1.100
   
   Resultado: Substitui em todos os 13 arquivos mapeados instantaneamente!
"""