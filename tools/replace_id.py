#!/usr/bin/env python3
"""
Script para encontrar e substituir IPs hardcoded em um projeto React Native
"""

import os
import re
import argparse
from pathlib import Path

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

def replace_ip_in_file(file_path, old_ip, new_ip):
    """Substitui um IP por outro em um arquivo"""
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
    
    args = parser.parse_args()
    
    project_path = os.path.abspath(args.project_path)
    
    if not os.path.exists(project_path):
        print(f"❌ Caminho do projeto não encontrado: {project_path}")
        return
    
    # Escaneia o projeto
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