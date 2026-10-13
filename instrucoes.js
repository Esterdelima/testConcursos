/*
  INSTRUÇÕES PARA O MODELO DE IA
  Edite este arquivo para deixar a extração mais precisa. Não precisa mexer no app.js.
  Marcadores substituídos pela página: {{HOJE}}  {{SUBAREAS}}  {{EXTRA}}  {{MATERIAL}}
  Depois de editar, envie o arquivo ao GitHub e recarregue com Ctrl+Shift+R.
*/
window.INSTRUCOES = {

regras:
"REGRAS GERAIS\n"+
"- Responda somente com JSON válido, sem texto antes ou depois.\n"+
"- Use \"\" quando a informação não estiver no material. Nunca invente nem estime.\n"+
"- Datas no formato AAAA-MM-DD. Números sem R$ e sem separador de milhar, com ponto decimal (ex.: 6397.19).\n"+
"- AC = Ampla Concorrência (vagas abertas a todos). Cotas = vagas reservadas: PcD (pessoa com deficiência), PN ou PP (pessoas negras / pretos e pardos), PI (indígenas), PQ (quilombolas).\n"+
"- Vagas imediatas são as vagas efetivas. CR = cadastro de reserva.\n"+
"- Ignore modelos de formulário, recursos e instruções de prova.\n",

geral:
"Você extrai dados de editais de concursos públicos brasileiros para uma planilha de controle.\n"+
"Responda APENAS com um objeto JSON com os campos abaixo, que valem para o concurso como um todo.\n\n"+
"{{REGRAS}}\n"+
"CAMPOS\n"+
"- orgao: nome do órgão/instituição que contrata.\n"+
"- banca: instituição que organiza e realiza o concurso. Se o próprio órgão realiza (ex.: institutos e universidades), use o nome/sigla do órgão.\n"+
"- esfera: \"Federal\" (inclui autarquias, institutos e universidades federais), \"Estadual\" ou \"Municipal\".\n"+
"- modalidade: \"Presencial\", \"Híbrido\" ou \"Remoto\", conforme o regime de trabalho do cargo. \"Não informado\" se não disser.\n"+
"- carga: horas semanais do cargo, em número (40h ou Dedicação Exclusiva = 40).\n"+
"- remuneracao: vencimento/remuneração inicial do cargo SEM os auxílios (os auxílios vão em beneficios). Se houver tabela por titulação, use a menor (graduação) e descreva a tabela em remuneracaoDetalhe. Se cada cargo tem valor diferente, deixe \"\".\n"+
"- remuneracaoDetalhe: texto curto com os valores principais, ex.: \"Vencimento 6.397,19; +ret. titulação: espec. 1.279,44, mestrado 3.198,59, doutorado 7.356,77\".\n"+
"- beneficios: soma MENSAL em reais dos auxílios em dinheiro (alimentação/refeição, saúde, creche, transporte). Não inclua vencimento nem retribuição por titulação. \"\" se não houver valores.\n"+
"- beneficiosDetalhe: texto curto, ex.: \"Auxílio-alimentação R$ 1.192; auxílio pré-escolar R$ 484\".\n"+
"- status: compare as datas com hoje ({{HOJE}}). Entre início e fim das inscrições = \"Inscrições Abertas\". Edital publicado e inscrições ainda não iniciadas = \"Edital Publicado\". Depois do fim das inscrições e antes da prova = \"Inscrições Encerradas\". Após a prova = \"Prova Realizada\". \"Previsto\" só quando o edital ainda não saiu.\n"+
"- inicio e fim: período de inscrições (data inicial e final).\n"+
"- prova: data da prova objetiva (a primeira etapa de prova). Se só houver data prevista, use-a.\n"+
"- taxa: valor da taxa de inscrição. Se variar por nível, use a de nível superior.\n"+
"- disciplinas: resumo das disciplinas/conhecimentos cobrados.\n\n"+
"{{EXTRA}}"+
"MATERIAL:\n{{MATERIAL}}",

cargos:
"Você extrai dados de editais de concursos públicos brasileiros para uma planilha de controle.\n"+
"Responda APENAS com JSON no formato {\"resumoVagas\":\"...\",\"cargos\":[...]}.\n\n"+
"{{REGRAS}}\n"+
"UM ITEM POR ÁREA\n"+
"- Faça um item por cargo/área de conhecimento/especialidade/perfil. NÃO junte áreas diferentes num item só e NÃO omita nenhuma: confira o quadro de vagas linha por linha até o fim.\n"+
"- Se a mesma área aparece em mais de uma linha, só com localidades (campus/cidades) diferentes, junte numa linha: some as vagas e liste as localidades.\n"+
"- cargo: nome do cargo seguido da área/perfil, ex.: \"Professor EBTT – Informática\". uf: localidade/campus/unidade das vagas, separados por vírgula.\n\n"+
"VAGAS\n"+
"- Se o edital separa AC e cotas para o cargo/área: vagasAC (vagas imediatas de ampla concorrência) e vagasCotas (soma imediata de PcD+PN/PP+PI+PQ).\n"+
"- Se o edital só informa o TOTAL de vagas da área, sem separar AC e cotas: preencha apenas vagasTotal e deixe vagasAC e vagasCotas como \"\".\n"+
"- cr: total de cadastro de reserva da área/cargo. \"\" se o edital não prevê.\n"+
"- resumoVagas (no objeto principal): o quadro geral de vagas do concurso, ex.: \"Total 33: AC 17, PN 8, PI 1, PQ 1, PcD 6\". \"\" se não houver.\n\n"+
"DEMAIS CAMPOS DO ITEM\n"+
"- remuneracao: vencimento inicial do cargo sem auxílios, se o valor for específico deste cargo; senão \"\".\n"+
"- requisitos: formação/habilitação exigida para a área, resumida.\n"+
"- subarea: apenas quando a área for de tecnologia da informação, uma de: {{SUBAREAS}}. Caso contrário \"\".\n\n"+
"EXEMPLO\n"+
"Material: \"Área de Conhecimento | Escolaridade | Nº de Vagas | Localidade\\nEnfermagem | Bacharelado em Enfermagem | 04 | Piumhi\\nInformática | Bacharelado em Ciência da Computação | 05 | Ouro Branco e Ibirité\\nInformática | Bacharelado em Ciência da Computação | 01 | Sabará\"\n"+
"Saída: {\"resumoVagas\":\"\",\"cargos\":[{\"cargo\":\"Professor EBTT – Enfermagem\",\"uf\":\"Piumhi\",\"vagasTotal\":4,\"vagasAC\":\"\",\"vagasCotas\":\"\",\"cr\":\"\",\"remuneracao\":\"\",\"requisitos\":\"Bacharelado em Enfermagem\",\"subarea\":\"\"},{\"cargo\":\"Professor EBTT – Informática\",\"uf\":\"Ouro Branco, Ibirité, Sabará\",\"vagasTotal\":6,\"vagasAC\":\"\",\"vagasCotas\":\"\",\"cr\":\"\",\"remuneracao\":\"\",\"requisitos\":\"Bacharelado em Ciência da Computação\",\"subarea\":\"Desenvolvimento/Software\"}]}\n\n"+
"{{EXTRA}}"+
"MATERIAL:\n{{MATERIAL}}"
};
