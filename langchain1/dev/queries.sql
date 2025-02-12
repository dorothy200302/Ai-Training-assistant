-- 用户相关查询
-- 1. 获取用户及其角色和部门信息
SELECT 
    u.email,
    u.username,
    r.role_name,
    d.department_name,
    e.leader_id
FROM users u
JOIN employees e ON u.email = e.email
JOIN roles r ON e.role_id = r.role_id
JOIN departments d ON e.department_id = d.department_id
WHERE u.is_active = true;

-- 2. 获取部门主管列表
SELECT 
    e.email,
    e.username,
    d.department_name,
    COUNT(sub.email) as subordinates_count
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN roles r ON e.role_id = r.role_id
LEFT JOIN employees sub ON sub.leader_id = e.employee_id
WHERE r.role_name = '部门主管'
GROUP BY e.email, e.username, d.department_name;

-- 文档相关查询
-- 1. 获取用户的文档列表及其状态
SELECT 
    td.title,
    td.document_type,
    td.status,
    td.created_at,
    u.username as creator_name,
    d.department_name
FROM training_documents td
JOIN users u ON td.user_email = u.email
JOIN employees e ON u.email = e.email
JOIN departments d ON e.department_id = d.department_id
WHERE td.status = 'active'
ORDER BY td.created_at DESC;

-- 2. 按部门统计文档数量
SELECT 
    d.department_name,
    COUNT(td.document_id) as doc_count,
    dt.type_name as document_type
FROM departments d
JOIN employees e ON d.department_id = e.department_id
JOIN training_documents td ON e.email = td.user_email
JOIN document_types dt ON td.document_type = dt.type_name
GROUP BY d.department_name, dt.type_name
ORDER BY d.department_name, doc_count DESC;

-- 权限相关查询
-- 1. 获取用户的所有权限
SELECT DISTINCT
    u.email,
    u.username,
    p.permission_name,
    p.description
FROM users u
JOIN employees e ON u.email = e.email
JOIN roles r ON e.role_id = r.role_id
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
WHERE u.is_active = true;

-- 培训文档模板查询
-- 1. 获取所有活跃的培训模板
SELECT 
    td.title,
    td.content,
    td.document_type,
    td.category,
    u.username as creator_name,
    td.created_at
FROM training_documents td
JOIN users u ON td.user_email = u.email
WHERE td.status = 'active'
AND td.title LIKE '%模板%'
ORDER BY td.created_at DESC;

-- 部门层级关系查询
-- 1. 获取部门的层级结构
WITH RECURSIVE department_hierarchy AS (
    -- 基础查询：获取顶级部门
    SELECT 
        e.employee_id,
        e.email,
        e.username,
        d.department_name,
        e.leader_id,
        1 as level
    FROM employees e
    JOIN departments d ON e.department_id = d.department_id
    WHERE e.leader_id IS NULL
    
    UNION ALL
    
    -- 递归查询：获取下级部门
    SELECT 
        e.employee_id,
        e.email,
        e.username,
        d.department_name,
        e.leader_id,
        dh.level + 1
    FROM employees e
    JOIN departments d ON e.department_id = d.department_id
    JOIN department_hierarchy dh ON e.leader_id = dh.employee_id
)
SELECT 
    email,
    username,
    department_name,
    level
FROM department_hierarchy
ORDER BY level, department_name;

-- 错题相关查询
-- 1. 根据课程搜索错题
SELECT 
    m.mistake_id,
    m.question,
    m.correct_answer,
    m.user_answer,
    m.explanation,
    m.course_name,
    m.created_at,
    u.username as student_name
FROM mistakes m
JOIN users u ON m.user_email = u.email
WHERE m.course_name = :course_name
ORDER BY m.created_at DESC;

-- 2. 按课程统计错题数量
SELECT 
    course_name,
    COUNT(*) as mistake_count,
    COUNT(DISTINCT user_email) as student_count
FROM mistakes
GROUP BY course_name
ORDER BY mistake_count DESC;

-- 3. 获取用户在特定课程的错题列表
SELECT 
    m.mistake_id,
    m.question,
    m.correct_answer,
    m.user_answer,
    m.explanation,
    m.created_at,
    m.review_count,
    m.last_review_at
FROM mistakes m
WHERE m.user_email = :user_email 
AND m.course_name = :course_name
ORDER BY m.last_review_at DESC;

-- 4. 获取最近一周的错题统计
SELECT 
    course_name,
    DATE(created_at) as mistake_date,
    COUNT(*) as daily_count
FROM mistakes
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY course_name, DATE(created_at)
ORDER BY mistake_date DESC, daily_count DESC;

-- 5. 获取需要复习的错题（超过7天未复习）
SELECT 
    m.mistake_id,
    m.question,
    m.course_name,
    m.last_review_at,
    DATEDIFF(CURDATE(), m.last_review_at) as days_since_review
FROM mistakes m
WHERE m.user_email = :user_email
AND (
    m.last_review_at IS NULL 
    OR DATEDIFF(CURDATE(), m.last_review_at) >= 7
)
ORDER BY m.last_review_at ASC NULLS FIRST;

-- 查询指定科目的前五条错题
SELECT 
    curse as course_name,
    question,
    error,
    answer,
    analyzation as analysis,
    check_point
FROM mistakes 
WHERE curse = :course_name
LIMIT 5;

-- 如果需要按时间倒序，可以这样写：
SELECT 
    curse as course_name,
    question,
    error,
    answer,
    analyzation as analysis,
    check_point
FROM mistakes 
WHERE curse = :course_name
ORDER BY id DESC  -- 假设有 id 字段作为创建顺序的标识
LIMIT 5;

-- 如果要包含错题的统计信息：
SELECT 
    m.curse as course_name,
    m.question,
    m.error,
    m.answer,
    m.analyzation as analysis,
    m.check_point,
    COUNT(*) OVER(PARTITION BY m.curse) as total_mistakes_in_course
FROM mistakes m
WHERE m.curse = :course_name
LIMIT 5; 