#!/usr/bin/env python3
"""Generate an unsigned Apple Shortcut. Sign with `shortcuts sign --mode anyone`."""
import plistlib
import uuid
from pathlib import Path

def uid(): return str(uuid.uuid4()).upper()
def action(kind, **params): return {'WFWorkflowActionIdentifier':'is.workflow.actions.'+kind,'WFWorkflowActionParameters':params}
def output(name, id): return {'Value':{'OutputName':name,'OutputUUID':id,'Type':'ActionOutput'},'WFSerializationType':'WFTextTokenAttachment'}
def text(value): return {'Value':{'string':value,'attachmentsByRange':{}},'WFSerializationType':'WFTextTokenString'}
def mixed(value, variable, offset): return {'Value':{'string':value,'attachmentsByRange':{'{%d, 1}'%offset:variable['Value']}},'WFSerializationType':'WFTextTokenString'}
def dictionary(values): return {'Value':{'WFDictionaryFieldValueItems':[{'WFItemType':0,'WFKey':text(k),'WFValue':v} for k,v in values.items()]},'WFSerializationType':'WFDictionaryFieldValue'}
token_id, qr_id, photo_id, image_id, request_id = [uid() for _ in range(5)]
actions = [
 action('comment',WFCommentActionText='PandaQR · 更新群二维码图片\n先在 app.pandaqr.xyz/developer 创建限定到该图片活码的 Token，权限 qrs:write + images:write。修改下面两个文本框。不要分享填入真实 Token 的快捷指令。运行后选择新图片；不会改变永久扫码地址。图片须小于 2 MiB。'),
 action('gettext',WFTextActionText='PASTE_ACCESS_TOKEN',UUID=token_id),
 action('gettext',WFTextActionText='PASTE_QR_ID',UUID=qr_id),
 action('selectphoto',WFSelectMultiplePhotos=False,UUID=photo_id),
 action('image.convert',WFInput=output('Photos',photo_id),WFImageFormat='JPEG',WFImageCompressionQuality=0.85,WFImagePreserveMetadata=False,UUID=image_id),
 action('downloadurl',WFURL=mixed('https://app.pandaqr.xyz/api/v1/qrs/\ufffc/image',output('Text',qr_id),len('https://app.pandaqr.xyz/api/v1/qrs/')),
   WFHTTPMethod='PUT',WFHTTPHeaders=dictionary({'Authorization':mixed('Bearer \ufffc',output('Text',token_id),7),'Content-Type':text('image/jpeg')}),
   WFHTTPBodyType='File',WFRequestVariable=output('Converted Image',image_id),UUID=request_id),
 action('previewdocument',WFInput=output('Contents of URL',request_id))
]
workflow = {'WFWorkflowClientVersion':'3030.0.4','WFWorkflowMinimumClientVersion':900,'WFWorkflowMinimumClientVersionString':'900',
 'WFWorkflowName':'PandaQR 更新群二维码','WFWorkflowIcon':{'WFWorkflowIconStartColor':4282601983,'WFWorkflowIconGlyphNumber':59511},
 'WFWorkflowTypes':[],'WFWorkflowInputContentItemClasses':[], 'WFWorkflowActions':actions,
 'WFWorkflowImportQuestions':[
 {'ActionIndex':1,'Category':'Parameter','ParameterKey':'WFTextActionText','Text':'填写 PandaQR Access Token（只授权目标图片活码）','DefaultValue':'PASTE_ACCESS_TOKEN'},
 {'ActionIndex':2,'Category':'Parameter','ParameterKey':'WFTextActionText','Text':'填写图片活码 ID（不是短链接 slug）','DefaultValue':'PASTE_QR_ID'}]}
Path('public/shortcuts/PandaQR-Update-Image.unsigned.shortcut').write_bytes(plistlib.dumps(workflow,fmt=plistlib.FMT_BINARY))
