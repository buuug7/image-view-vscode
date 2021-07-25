import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "image-view-vscode.preview",
    (clickedFile: any, selectedFiles: any) =>
      start(context, clickedFile, selectedFiles)
  );

  context.subscriptions.push(disposable);
}

function start(
  context: vscode.ExtensionContext,
  clickedFile: any,
  selectedFiles: any
) {
  const panel = vscode.window.createWebviewPanel(
    "catCoding",
    "Cat coding",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const vueScriptPath = path.join(context.extensionPath, "vendor/vue/vue.js");
  const vueUri = panel.webview.asWebviewUri(vscode.Uri.file(vueScriptPath));

  if (selectedFiles.length) {
    const firstSelected = selectedFiles[0];
    console.log(firstSelected);
    const files = fs.readdirSync(firstSelected.fsPath);
    type ImgItem = { src: string; uri: vscode.Uri; delete: boolean };
    const images: ImgItem[] = [];

    for (const fileName of files) {
      const fileUri = vscode.Uri.file(
        path.join(firstSelected.fsPath, fileName)
      );
      const webviewUri = panel.webview.asWebviewUri(fileUri);
      images.push({
        src: webviewUri.toString(),
        uri: fileUri,
        delete: false,
      });
    }

    panel.title = firstSelected.fsPath + ` (${images.length})`;
    panel.webview.html = getWebviewContent(vueUri, JSON.stringify(images));

    panel.webview.onDidReceiveMessage(
      async (message) => {
        const deletedImages: ImgItem[] = message.images;
        console.log(deletedImages);
        for (const img of deletedImages) {
          await vscode.workspace.fs.delete(img.uri);
        }

        await vscode.window.showInformationMessage(
          `Deleted ${deletedImages.length} files`
        );

        panel.dispose();
      },
      undefined,
      context.subscriptions
    );
  }
}

function getWebviewContent(vueUri: any, images: string) {
  const html = `
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta http-equiv="X-UA-Compatible" content="IE=edge" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>Document</title>
			<link rel="stylesheet" href="https://unpkg.com/@buuug7/simplify-button/index.css">
			<script src="${vueUri}"></script>
			<style>
				.imgList {
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 2rem 0.5rem;
					margin-top: 1rem;
				}
				
				.imgList img.delete {
				  opacity: .5;
				}
				</style>
		</head>
		<body>
			<div id="root">
			  <div>
			    <button class="btn primary" @click="deleteImages">Delete ({{deleteCont}})</button>
        </div>
				<div class="imgList">
					<img v-for="item in images" :class="item.delete ? 'delete': ''" :src="item.src" @click="handleClick(item)">
				</div>
			</div>
	
			<script>
			const vscode = acquireVsCodeApi();
			const vm = new Vue({
				el: '#root',
				data: {
					images: ${images},
					deleteCont: 0,
				},
				mounted () {
				},
				methods: {
				  handleClick(item) {
				    console.log(item)
				    this.images = this.images.map(it => {
				      return it.uri === item.uri ? {...it, delete: !item.delete}: it;
				    });
				    
				    this.deleteCont = this.images.filter(item => item.delete).length;
				  },
				  
				  deleteImages() {
				    vscode.postMessage({
				      images: this.images.filter(item => item.delete)
				    })
				  }
				}
			})
			</script>
		</body>
	</html>
	`;

  return html;
}

export function deactivate() {}
