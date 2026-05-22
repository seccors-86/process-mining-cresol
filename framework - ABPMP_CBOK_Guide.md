# Framework: ABPMP CBOK Guide v3.0

## Gestão de Processos de Negócio como Disciplina
O CBOK (Common Body of Knowledge) atua como um guia enciclopédico das práticas de BPM. Ele define BPM não como uma ferramenta de TI, mas como uma disciplina de gerenciamento que trata os processos de negócio como ativos valiosos.

## Papéis no Gerenciamento de Processos
- **Dono do Processo (Process Owner)**: O principal responsável pelo processo de ponta a ponta. Deve ser mapeado no nível mais alto de gestão (não é um recurso alocado numa Lane).
- **Atores/Executores (Participants/Roles)**: São os departamentos ou sistemas representados pelas **Raias (Lanes)** no BPMN.

## Modelagem e Entrega do Desenho de Processos
Segundo o CBOK, a entrega de um projeto de mapeamento AS-IS ou TO-BE deve incluir não apenas o diagrama, mas as *Regras de Negócio* acopladas.

### Atributos Cruciais a Mapear (Metadata)
Cada caixa (atividade) no diagrama deve conter documentação associada a:
1. **Entradas (Inputs)**
2. **Saídas (Outputs)**
3. **Regras de Negócio Associadas** (ex: restrições financeiras)
4. **Sistemas Envolvidos**
5. **Tempo Estimado/Custo**

## Aplicação no Process-Mining-Cresol
- **Meta-informações no Node Editor**: O nosso `NodeEditorModal` já suporta o campo "Observações". Com base no CBOK, este campo é OBRIGATÓRIO do ponto de vista de entrega de qualidade e deve ser incentivado. O prompt da IA deve ser instruído a gerar regras de negócio, SLA e inputs/outputs sempre que inferir uma atividade.
- O mapeamento entregue não deve ser apenas visual, mas sim a documentação estruturada exportada em DOCX, que o sistema já faz. O DOCX gerado precisará conter as anotações ricas para ser aderente ao padrão CBOK de "Documentação de Processo".
