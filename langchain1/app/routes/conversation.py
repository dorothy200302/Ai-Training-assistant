from flask import Blueprint, request, jsonify
from ..services.conversation_service import ConversationService
from ..utils.validators import validate_answers

conversation_bp = Blueprint('conversation', __name__)
conversation_service = ConversationService()

@conversation_bp.route('/start', methods=['POST'])
def start_conversation():
    """开始新的问答会话"""
    try:
        result = conversation_service.start_conversation()
        return jsonify({
            'status': 'success',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@conversation_bp.route('/answer', methods=['POST'])
def process_answer():
    """处理用户答案并返回下一步"""
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not data or 'step' not in data or 'answers' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields'
            }), 400
        
        # 验证答案格式
        validation_errors = validate_answers(
            data['step'],
            data['answers'],
            conversation_service.questions[data['step']]
        )
        
        if validation_errors:
            return jsonify({
                'status': 'error',
                'message': 'Invalid answers',
                'errors': validation_errors
            }), 400
        
        # 处理答案
        result = conversation_service.process_answer(
            data['step'],
            data['answers']
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        })
        
    except ValueError as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@conversation_bp.route('/summary', methods=['GET'])
def get_summary():
    """获取当前会话的答案汇总"""
    try:
        summary = conversation_service.get_conversation_summary()
        return jsonify({
            'status': 'success',
            'data': summary
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@conversation_bp.route('/generate-document', methods=['POST'])
async def generate_document():
    """生成培训文档"""
    try:
        # 检查是否完成所有问答
        summary = conversation_service.get_conversation_summary()
        if not all(step in summary for step in conversation_service.steps):
            return jsonify({
                'status': 'error',
                'message': 'Please complete all questions first'
            }), 400
        
        # 生成文档
        document = await conversation_service.generate_document()
        
        return jsonify({
            'status': 'success',
            'data': document
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500