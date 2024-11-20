from flask import Blueprint, request, jsonify, send_file
from ..services.document_service import DocumentGenerator
from ..utils.file_handler import FileHandler
from ..utils.auth import login_required

document_bp = Blueprint('document', __name__)
document_generator = DocumentGenerator()
file_handler = FileHandler()

@document_bp.route('/generate', methods=['POST'])
@login_required
async def generate_document():
    """生成培训文档"""
    try:
        data = request.get_json()
        template_path = None
        
        if 'template_id' in data:
            # 获取模板路径
            template_path = get_template_path(data['template_id'])
            
        doc_path = await document_generator.generate_training_doc(
            data['requirements'],
            template_path
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'doc_path': doc_path
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@document_bp.route('/convert', methods=['POST'])
@login_required
def convert_document():
    """转换文档格式"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file provided'
            }), 400
            
        file = request.files['file']
        target_format = request.form.get('format')
        
        # 保存上传的文件
        source_path = file_handler.save_upload(file, 'temp')
        
        # 转换文档
        output_path = document_generator.convert_document(
            source_path,
            target_format
        )
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"converted.{target_format}"
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500 