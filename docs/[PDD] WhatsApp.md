# PROJETO DESENVOLVIMENTO RPA  
**Santa Casa Curitiba – Confirmação de Agendamento Via WhatsApp**  
**Versão: 1.0**  
**Data: 27/03/2025**

---

## Sumário

1. [Função do documento](#1-função-do-documento)  
2. [Analistas responsáveis pelo processo](#2-analistas-responsáveis-pelo-processo)  
3. [Atividades que serão executadas](#3-atividades-que-serão-executadas)  
4. [Sistemas, arquivos e diretórios utilizados](#4-sistemas-arquivos-e-diretórios-utilizados)  
5. [Processamento do Robô](#5-processamento-do-robô)  
6. [Confirmação de Agendamento Via WhatsApp](#6-confirmação-de-agendamento-via-whatsapp)

---

## Histórico das Revisões

| Versão | Data       | Responsável   | Alterações                      |
|--------|------------|---------------|---------------------------------|
| 1.0    | 27/03/2025 | Lucas Moreira | Versão Inicial – Processo TO BE |

---

## 1. Função do documento

Este documento deve conter todas as informações necessárias para o desenvolvimento da automação “Santa Casa Curitiba: Confirmação de Agenda Via WhatsApp”.  
Ele contém as regras de negócio necessárias para o desenvolvimento da funcionalidade.

---

## 2. Analistas responsáveis pelo processo

Analistas da Santa Casa Curitiba responsáveis pelo processo em questão e poderão auxiliar o nosso time ao tirar dúvidas, resolver problemas manuais caso a automação falhe, etc.

| Nome        | Contato                               |
|-------------|----------------------------------------|
| João Gabriel| joão.meiado@hospitalsra.com.br         |

---

## 3. Atividades que serão executadas

- XXXX  
- XXXX  
- XXXX  
- XXX  

---

## 4. Sistemas, arquivos e diretórios utilizados

| ID | Tipo    | Nome      | Perfil / Transação |
|----|---------|-----------|---------------------|
| 1  | Sistema | A definir | N/A                 |
| 2  | Sistema | A definir | N/A                 |

---

## 5. Processamento do Robô

**Horário de Funcionamento online:**  
**Período de utilização:**  

**Confirmação de Agenda Via WhatsApp:**  
☒ Segunda  
☒ Terça  
☒ Quarta  
☒ Quinta  
☒ Sexta  
☒ Sábado  
☒ Domingo  

---

## 6. Confirmação de Agendamento Via WhatsApp

### Passo 1

O RPA coletará os dados do agendamento do paciente no sistema IPM e os replicará para o sistema Tasy 48 horas antes do dia seguinte.

> Exemplo: No dia 26/03/2025, às 00:00:01, o RPA verificará a agenda do sistema IPM referente à data 28/03/2025 e importará as informações para o sistema Tasy.

Esses dados serão salvos em um **Endpoint** com o seguinte dicionário:

| Nome         | CPF       | Telefone         | Data Agendamento | Horário | Especialidade | Protocolo Exame      | Tipo        |
|--------------|-----------|------------------|------------------|---------|---------------|----------------------|-------------|
| Helena Souza | 54545545  | (16) 99223-9660  | 27/03/2025       | 08:00   | Colonoscopia  | Preparo do exame.PDF | Procedimento|
| Manuel Dias  | 656005656 | (45) 99289-5460  | 27/03/2025       | 08:10   | Urologia      | Preparo do exame.PDF | Procedimento|
| Maria Eduarda| 998285460 | (45) 99828-5460  | 27/03/2025       | 08:20   | Endoscopia    |                      | Consulta    |

> OBS: Pacientes sem telefone devem ser sinalizados via relatório (Passo 3).

**Fluxograma do Passo 1:**  
![Fluxograma Passo 1](docs\imgs_doc_PDD\imagem1.jpeg)

---

### Passo 2

Mensagens via WhatsApp serão enviadas **40 horas antes** do atendimento, e o paciente terá **24 horas para responder**.  
**Envios devem ser processados individualmente, sem paralelismo.**

#### Mensagem para CONSULTAS

> Bom dia!  
> Sua consulta referente a **[Especialidade]** está agendada para o dia **dd/mm/aaaa**, às **hh:mmh**. Deseja confirmar a consulta?

**Exemplo:**  
Bom dia! Sua consulta referente a **Endocrinologia** está agendada para o dia **28/03/2025**, às **08:10h**. Deseja confirmar a consulta?

#### Mensagem para PROCEDIMENTOS

> Bom dia!  
> O seu procedimento referente a **[Especialidade]** está agendado para o dia **dd/mm/aaaa**, às **hh:mmh**. Deseja confirmar o procedimento?

---

#### Resposta: **SIM**

##### Se o exame **tiver preparo**:
> Agradecemos o seu retorno. O agendamento foi realizado para a data **dd/mm/aaaa**, às **hh:mmh**. Segue o preparo do exame.

-	No caso de agendamento referente ao procedimento “colonoscopia” (cód. 11380), deverá verificar se o agendamento é para o turno da manhã (8h -11:30h) ou para o turno da tarde (após 11:30h) para que o envio do protocolo seja de acordo com o turno agendado, deverá enviar um link para acessar o arquivo
**Para o turno da tarde**: preparo_tarde_colonoscopia.pdf
**Para o turno da manhã**: preparo_manhã_colonoscopia.pdf

-	No caso de agendamento referente ao procedimento “Eletroencefalograma - Adulto” (cód.13480), deverá enviar um link para acessar o arquivo: preparo_adulto_eletroencefalograma.pdf

- No caso de agendamento referente ao procedimento “Eletroencefalograma” (cód.13481), deverá enviar um link para acessar o arquivo: preparo_ped_eletroencefalograma.pdf

- No caso de agendamento referente ao procedimento “Endoscopia” (cód.11381) deverá enviar um link para acessar o arquivo: preparo_endoscopia.pdf

##### Se **não tiver preparo**:
> Agradecemos o seu retorno. O agendamento foi realizado para a data **dd/mm/aaaa**, às **hh:mmh**.

---

#### Resposta: **NÃO**

> Agradecemos o seu retorno. O agendamento foi desmarcado. Caso queira marcar um novo agendamento, entre em contato com a unidade básica de saúde da sua região.

---

#### Resposta inválida

- Reenviar a mensagem inicial **até 3 vezes**
- Na **quarta tentativa**, enviar:
> Não foi possível confirmar o agendamento. Por gentileza, entre em contato pelo telefone XXXX.

---

#### Casos sem WhatsApp ou sem telefone

Devem ser relatados no relatório conforme Passo 3.  
Além disso, **armazenar os dados no Endpoint**:

| Nome         | CPF       | Telefone         | Data Agendamento | Horário | Especialidade | Tipo        |
|--------------|-----------|------------------|------------------|---------|---------------|-------------|
| Helena Souza | 54545545  | (16) 99223-9660  | 27/03/2025       | 08:00   | Colonoscopia  | Procedimento|
| Manuel Dias  | 656005656 | (45) 99289-5460  | 27/03/2025       | 08:10   | Urologia      | Consulta    |

**Fluxograma do Passo 2:**  
![Fluxograma Passo 2](docs\imgs_doc_PDD\imagem2.jpeg)


---

### Passo 3

Gerar 3 relatórios **após 24h dos envios de mensagens e respostas**:

1. **Pacientes que desmarcaram as consultas**:
    Deverá ser enviado por e-mail após 24 horas dos envios das mensagens e respostas dos pacientes. 

    ![Pacientes que desmarcaram as consultas](docs\imgs_doc_PDD\imagem3.jpeg)

2. **Pacientes que confirmaram as consultas**  

    Deverá ser enviado por e-mail após 24 horas dos envios das mensagens e respostas dos pacientes.

    ![Pacientes que confirmaram as consultas](docs\imgs_doc_PDD\imagem4.jpeg)

3. **Pacientes sem WhatsApp ou sem resposta**

    Deverá ser enviado por e-mail após 24 horas dos envios das mensagens e respostas dos pacientes
    ![Pacientes que desmarcaram as consultas](docs\imgs_doc_PDD\imagem5.jpeg)

> OBS: No relatório 3, incluir coluna “**Motivo**” com:  
> - Não tem WhatsApp  
> - Sem registro telefônico

**Fluxograma do Passo 3:**  
![Fluxograma Passo 3](docs\imgs_doc_PDD\imagem6.jpeg)


### Passo 4
Conforme mapeamento realizado com o colaborador da Santa Casa, o escopo referente a Consulta/Procedimento segue planilha de referência. Qualquer alteração deve ser informada.

# ANEXO I - Planilha de referência

| Especialidade                      | Código Interno/Agenda                | Tipo        |
|-------------------------------------|--------------------------------------|-------------|
| Doppler De Carótidas / Ecodoppler   | 17742                                | Procedimento|
| Ultrassom Tireoide                  | 13368                                | Procedimento|
| Ultrassom Urinária                  | 17783                                | Procedimento|
| Ultrassom Articulação               | 17788                                | Procedimento|
| Ultrassom Pélvica                   | 11817                                | Procedimento|
| Ultrassom Próstata                  | 13518                                | Procedimento|
| Ultrassom Transvaginal              | 13446                                | Procedimento|
| Ecocardiograma                      | 13476                                | Procedimento|
| Teste Ergométrico                   | 13479                                | Procedimento|
| Fonoaudiologia - Hsra               | 11343                                | Procedimento|
| Endoscopia                          | 11381                                | Procedimento|
| Colonoscopia                        | 11380                                | Procedimento|
| Eletroencefalograma - Adulto         | 13480                                | Procedimento|
| Ecocardiograma                      | 18340                                | Procedimento|
| Eletroencefalograma                  | 13481                                | Procedimento|
| Cardiologia                         | Marcus Figueiredo Brodbeck           | Consulta    |
| Nefrologia                          | Orlando Brunet Filho                 | Consulta    |
| Otorrinolaringologia                | Camila Schreiber Bortolazza          | Consulta    |
| Urologia                            | João Carlos Schneider Michelotto    | Consulta    |
| Cardiologista Pediátrico            | Marcelo Credidio Dias Pinto          | Consulta    |
| Endocrinologia/Metabologia          | Karina Da Silva Almeida              | Consulta    |
| Dermatologista Pediátrico           | Rossana Spoladore                    | Consulta    |
| Neuropediatria                      | Luiz Alberto Cagliati Santos         | Consulta    |
| Otorrinolaringologia                | Rafael Souza Moraes                  | Consulta    |
