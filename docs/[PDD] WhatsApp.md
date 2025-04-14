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

- Se o exame **tiver preparo**:
> Agradecemos o seu retorno. O agendamento foi realizado para a data **dd/mm/aaaa**, às **hh:mmh**. Segue o preparo do exame.

- Se **não tiver preparo**:
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

Gerar 3 relatórios após 24h dos envios de mensagens e respostas:

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
