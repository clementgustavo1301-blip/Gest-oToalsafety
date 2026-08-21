import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

function base64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array(0);
  const parts = base64String.split(',');
  const base64Data = parts.length > 1 ? parts[1] : parts[0];
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateSSTWordReport = async (data) => {
  const children = [];

  // Title section
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "SISTEMA DE GESTÃO DE SEGURANÇA NO TRABALHO - SGST",
          bold: true,
          size: 24, // 12pt
        }),
      ],
      spacing: { after: 200 }
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `TÍTULO: ${data.reportTitle || 'RELATÓRIO DE AÇÕES DE SST'}`,
          bold: true,
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 400 }
    })
  );

  // Info Table
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: `Relatório nº: ${data.reportNumber || '001/' + new Date().getFullYear()}` })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
          }),
          new TableCell({
            children: [new Paragraph({ text: `Data: ${data.date}`, alignment: AlignmentType.RIGHT })],
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `Empresa: ${data.companyName}`, bold: true })] })],
            columnSpan: 2,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: `Local: ${data.siteName || ''}` })],
            columnSpan: 2,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
          }),
        ],
      }),
    ],
  });

  children.push(infoTable);
  children.push(new Paragraph({ spacing: { after: 400 } }));

  // Actions
  if (data.actions && data.actions.length > 0) {
    data.actions.forEach((action, actionIndex) => {
      // Action Table
      const actionTableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: `Ação: ${action.actionText}` })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: `Justificativa da ação: ${action.justificationText}` })],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
            }),
          ],
        }),
      // Irregularities Header + List
      if (action.irregularities && action.irregularities.trim()) {
        actionTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Irregularidades apontadas:", bold: true })] })],
                shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          })
        );

        const irregularities = action.irregularities.split('\n');
        const listItems = irregularities.map(item => new Paragraph({ text: `• ${item.trim()}` }));
        if (listItems.length > 0 && listItems[0].text !== '• ') {
          actionTableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: listItems,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
              ],
            })
          );
        }
      }

      // Photos
      if (action.photos && action.photos.length > 0) {
        const maxCols = action.photos.length > 2 ? 3 : 2;
        const photoTableRows = [];
        
        for (let i = 0; i < action.photos.length; i += maxCols) {
            const cellsImages = [];
            const cellsDesc = [];
            for (let j = 0; j < maxCols; j++) {
                const photo = action.photos[i + j];
                if (photo && photo.base64) {
                    try {
                        const uint8Data = base64ToUint8Array(photo.base64);
                        cellsImages.push(new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new ImageRun({
                                            data: uint8Data,
                                            transformation: {
                                                width: 200,
                                                height: 150,
                                            },
                                        })
                                    ]
                                })
                            ],
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        }));
                        cellsDesc.push(new TableCell({
                            children: [new Paragraph({ text: photo.description || ' ', alignment: AlignmentType.CENTER })],
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        }));
                    } catch (e) {
                        console.error(e);
                        cellsImages.push(new TableCell({ children: [new Paragraph({ text: "Erro na imagem" })] }));
                        cellsDesc.push(new TableCell({ children: [new Paragraph({ text: " " })] }));
                    }
                } else {
                    cellsImages.push(new TableCell({ children: [new Paragraph({ text: " " })] }));
                    cellsDesc.push(new TableCell({ children: [new Paragraph({ text: " " })] }));
                }
            }
            photoTableRows.push(new TableRow({ children: cellsImages }));
            photoTableRows.push(new TableRow({ children: cellsDesc }));
        }

        actionTableRows.push(
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            new Table({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                borders: {
                                    top: { style: BorderStyle.NONE, size: 0 },
                                    bottom: { style: BorderStyle.NONE, size: 0 },
                                    left: { style: BorderStyle.NONE, size: 0 },
                                    right: { style: BorderStyle.NONE, size: 0 },
                                    insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                                    insideVertical: { style: BorderStyle.NONE, size: 0 },
                                },
                                rows: photoTableRows
                            })
                        ],
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    })
                ]
            })
        );
      }

      // Recommendations Header + List
      if (action.recommendations && action.recommendations.trim()) {
        actionTableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Ação recomendada:", bold: true })] })],
                shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
              }),
            ],
          })
        );

        const recs = action.recommendations.split('\n');
        const listItems = recs.map(item => new Paragraph({ text: `• ${item.trim()}` }));
        if (listItems.length > 0 && listItems[0].text !== '• ') {
          actionTableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: listItems,
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                }),
              ],
            })
          );
        }
      }

      const actionTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
        rows: actionTableRows,
      });

      children.push(actionTable);
      children.push(new Paragraph({ spacing: { after: 400 } }));
    });
  }

  // Technical Notices
  if (data.technicalNotice) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "FFFF00", type: ShadingType.CLEAR },
                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Aviso Técnico:\n" + data.technicalNotice, bold: true })],
                  })
                ]
              })
            ]
          })
        ]
      })
    );
    children.push(new Paragraph({ spacing: { after: 200 } }));
  }

  if (data.technicalNoticeRed) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: "DC2626", type: ShadingType.CLEAR },
                margins: { top: 150, bottom: 150, left: 150, right: 150 },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: data.technicalNoticeRed, bold: true, color: "FFFFFF" })],
                  })
                ]
              })
            ]
          })
        ]
      })
    );
    children.push(new Paragraph({ spacing: { after: 600 } }));
  }

  // Signature
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "________________________________________________" })
      ],
      spacing: { before: 800 }
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.technicianName?.toUpperCase() || 'TÉCNICO', bold: true })
      ]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Técnico em Segurança do Trabalho", size: 18 }) // 9pt
      ]
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.technicianRegister || 'MTE / SRTE N°', size: 18 })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Relatorio_${data.reportTitle || 'SST'}_${data.companyName}_${data.date.replace(/\//g, '-')}.docx`);
};
